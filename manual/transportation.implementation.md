# 교통수단 알림 — 구현 plan

`manual/transportation.schema.md`의 명세를 실제 코드로 어떻게 옮길지 단계별
정리. 현재 구현은 단순 trip(노선번호 직접 입력 + 단일 leg + 도착 1회 알림),
명세는 Directions 기반 multi-leg 검색·환승·도착 push.

---

## 1. 갭 요약

| 영역 | 현재 (`38f4344` 기준) | 명세 |
|---|---|---|
| 입력 | 사용자가 `routeName` 직접 입력 | **목적지 검색** + GPS 출발 |
| 경로 | single leg | **여러 옵션** → 선택 (환승 포함) |
| 추적 | 도착 정류장까지 거리/stop | **leg별** 진행 상태 |
| 알림 | 1정거장 전 1회 push | **각 환승 + 최종 도착** push |
| Background | 권한 코멘트만 (권한 키 있음) | 백그라운드 GPS + push 발송 |

---

## 2. 외부 API 선택

**Google Maps Directions API (transit mode)**
- 한 호출로 transit + walking + transfers 한꺼번에 응답
- 글로벌 지원, transit_details에 line_name·short_name·departure_stop·arrival_stop·num_stops 포함
- 단가: $5 / 1000 requests (Basic) — 1트립당 1회 호출이라 저렴
- 키: `GOOGLE_MAPS_API_KEY` 이미 backend env에 있음
- **대안 (한국 한정)**: 공공데이터포털 TAGO/Topis — 무료지만 환승 routing 직접 합쳐야 함. Google이 더 단순.

**선택**: Google Directions. 비용이 부담되면 사용자 1일 directions 호출 quota를
`usage_events` 테이블에 `transit_directions` feature 키로 기록 + cap.

---

## 3. DB schema 변경

### 3.1 신규 테이블 `transit_trip_legs`

`transit_trips`는 trip 메타(목적지·status), `transit_trip_legs`가 leg별 상세.

```sql
CREATE TABLE aura.transit_trip_legs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id       uuid NOT NULL REFERENCES aura.transit_trips(id) ON DELETE CASCADE,
  leg_index     smallint NOT NULL,             -- 0부터
  mode          text NOT NULL,                  -- 'walking' | 'transit'
  transit_kind  text,                           -- 'BUS' | 'SUBWAY' | 'RAIL' | NULL(walking)
  line_name     text,                           -- "472번 버스" | "2호선"
  line_short    text,                           -- "472" | "2"
  departure_stop_name text,
  departure_lat numeric(9,6),
  departure_lng numeric(9,6),
  arrival_stop_name text,
  arrival_lat   numeric(9,6),
  arrival_lng   numeric(9,6),
  num_stops     smallint,                       -- transit leg에서 정거장 수
  duration_sec  int,
  polyline      text,                           -- encoded
  alert_threshold_stops smallint NOT NULL DEFAULT 1,
  alerted_at    timestamptz,                    -- 이미 push 발송했으면 set
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (trip_id, leg_index)
);
CREATE INDEX idx_transit_trip_legs_trip ON aura.transit_trip_legs(trip_id);
```

### 3.2 `transit_trips` 변경

기존 column 유지 + 추가:
- `current_leg_index smallint NOT NULL DEFAULT 0` — 사용자가 현재 어느 leg에
  있는지 (ping 처리에서 갱신)
- `destination_label text` — 검색 시 사용한 목적지 텍스트("광운대학교")
- 기존 `route_name`, `mode`는 NULL 허용으로 변경 (legs로 대체되니 deprecated)

### 3.3 마이그레이션 파일

`back/db/migrations/00NN_transit_multi_leg.sql` + `portable/` 미러
(`PORTABILITY_AND_PRODUCTION_NOTES.md` 정책 따름).

---

## 4. Backend 모듈 변경

### 4.1 `back/src/modules/transit/directions.ts` 신설

- `fetchDirections({originLat, originLng, destination, language, departureTime})`
  → `https://maps.googleapis.com/maps/api/directions/json?mode=transit&...`
- 응답 `routes[].legs[].steps[]`를 우리 schema(legs 배열)로 normalize
  - `step.travel_mode === "WALKING"` → `{mode: "walking", duration_sec, polyline}`
  - `step.travel_mode === "TRANSIT"` → `{mode: "transit", transit_kind: step.transit_details.line.vehicle.type, line_name, ...}`
- 8초 timeout + try/catch + 빈 fallback (CLAUDE.md 정책)
- 응답을 사용자별 Redis 30분 캐시 (key: 좌표·목적지·시간 hash)
- usage_events: `transit_directions` feature

### 4.2 `back/src/modules/transit/routes.ts` 확장

- `POST /api/v1/transit/directions` — 검색 (driver: directions.ts)
  body: `{ originLat, originLng, destination, language }`
  resp: `{ options: Array<{ legs: TransitLeg[], totalDurationSec, transferCount }> }`
- `POST /api/v1/transit/trips` — 기존, body 확장:
  - 기존 `routeName`/`mode`는 deprecated 유지
  - 신규 `legs: TransitLeg[]`, `destinationLabel: string` 받음 → trip + legs 저장
- `POST /api/v1/transit/trips/:id/ping` — 응답에 `currentLegIndex`, `nextTransitionStop`,
  `remainingStopsInLeg` 추가

### 4.3 `service.ts` 확장

- `startTrip` — legs 받으면 트랜잭션으로 trips + trip_legs 같이 insert
- `processPing(tripId, lat, lng)`:
  1. trip + legs 로드
  2. 현재 leg(`current_leg_index`)의 arrival_stop 까지 거리 계산
  3. `num_stops` 또는 거리 기반 임계 도달 → push (한 번만, `alerted_at` set)
  4. 사용자가 leg 종점 가까이 (예: 80m) 도달 → `current_leg_index` += 1
  5. 마지막 leg의 arrival 도달 → trip status = "arrived" + 도착 push

### 4.4 Push 카테고리

기존 `bus_arrival_warning` 외에:
- `transit_transfer_warning` — 환승 1정거장 전 ("X역에서 환승 준비")
- `transit_arrival_warning` — 최종 도착 1정거장 전 ("다음 정거장 하차")

`back/src/modules/push/`에 카테고리별 builder.

---

## 5. Frontend 변경

### 5.1 신규 화면 — `front/src/features/transit/screens/SearchTrip.tsx`

- 목적지 입력 (TextInput)
- 검색 버튼 → `transit/directions` 호출
- 응답 옵션을 카드로 표시 (transit chip + 시간 + 환승 수 + 첫 leg line)
- 카드 탭 → 선택된 옵션으로 `startTrip` 호출 → ActiveTripBanner로 전환

### 5.2 `ActiveTripBanner.tsx` 확장

- 단일 stop count → **leg 진행 progress bar**
- 현재 leg: 노선 이름 + 다음 transition 정류장 + 남은 stop
- 예: "[2호선 ─ 잠실 방면] 다음: 강변 (3정거장 남음, 환승)"
- 마지막 leg는 "최종 도착까지 N정거장"

### 5.3 `TransitModal.tsx` 분기 확장

- activeTrip 있으면 ActiveTripBanner
- 없으면 기존 StartTripScreen 대신 **SearchTrip** 진입
- StartTrip(직접 입력)은 fallback 또는 deprecated

### 5.4 Background location

- `react-native-background-geolocation` (또는 `react-native-location`) 의존성 추가
- iOS Info.plist `NSLocationAlwaysAndWhenInUseUsageDescription` (이미 있음)
- Android `ACCESS_BACKGROUND_LOCATION` Manifest 추가
- trip 시작 시 background 권한 요청 → 이미 거부면 ActionAlertModal로 안내
- 폴링 주기: 멀리 있을 때 30s, 다음 transition 1정거장 안일 땐 10s로 조정

### 5.5 Push 권한

- iOS Critical Alert entitlement는 비싸니 일반 alert + sound + vibration 우선
- 푸시 등록은 기존 `push_devices`/jobsService 패턴 활용

---

## 6. 단계별 PR (위험도 순)

| Step | 내용 | 의존 | 위험 |
|---|---|---|---|
| 1 | `directions.ts` + `POST /transit/directions` 응답만 (frontend 없음) | Google API key | 낮 |
| 2 | Frontend `SearchTrip` 검색·옵션 표시(dryRun, trip 시작 X) | Step 1 | 낮 |
| 3 | DB migration + service `startTrip(legs)` + 기존 single-leg 호환 | — | 중 (schema 변경) |
| 4 | ActiveTripBanner multi-leg progress + ping 응답에 currentLegIndex | Step 3 | 중 |
| 5 | Background location 의존성 추가 + 권한 흐름 + 폴링 | iOS/Android native 빌드 | 큼 |
| 6 | Multi-leg push 발송 + 카테고리 분리 | Step 3 | 중 |

각 step 끝나면 typecheck + 시뮬 검증 후 commit. Step 5는 native module 추가라
별도 PR 권장.

---

## 7. 비용 가드

- Directions API: 사용자별 일일 quota (`usage_events` `transit_directions`)
- Trip ping: 진행 중 trip만, 도착 후 즉시 stop
- Redis 캐시 (좌표 1km grid + 30분 TTL) — 같은 사용자가 같은 검색 반복 시 hit
- 사용자 1일 transit trip 평균 2-3회 가정 → directions 호출량 매우 적음

---

## 8. 명세에 없지만 고려 가치

- **트립 종료 알림 후 자동 stop** — "도착했어요" 알림에 "도착했어요/조금 더 가요"
  action button (이미 todo.md 명세에 비슷한 패턴)
- **출발 시점 알림** — 사용자가 일정 위치까지 이동 시간 X분 전이면 "지금
  출발하세요" (calendar travel-plan과 결합)
- **delay 감지** — 실시간 ETA가 처음 estimate보다 느려지면 "예상보다 5분
  지연" 추가 alert

이건 이번 plan의 Out of Scope. transportation v1 안정 후 v2.
