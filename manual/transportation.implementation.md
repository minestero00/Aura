# 교통수단 알림 — 구현 plan (client-driven)

`manual/transportation.schema.md`의 명세를 실제 코드로 어떻게 옮길지 정리.

> **중요**: 처음 plan은 server-driven(매분 ping → backend가 push 발송) 가정이었으나
> 사용자 통찰로 client-driven 패턴이 모든 면에서 우수함을 확인. trip state는
> 본질적으로 user 한 device에서만 의미 있음 → DB·backend ping 모두 불필요.
> iOS의 **Region Monitoring(geofencing)** 으로 backend 없이 더 정확하게 동작.

---

## 1. 갭 요약

| 영역 | 현재 (`38f4344` 기준) | 명세 |
|---|---|---|
| 입력 | 사용자가 `routeName` 직접 입력 | **목적지 검색** + GPS 출발 |
| 경로 | single leg | **여러 옵션** → 선택 (환승 포함) |
| 추적 | 도착 정류장까지 거리/stop | **leg별** 진행 (환승 + 도착) |
| 알림 | 1정거장 전 1회 push | **각 환승 + 최종 도착** local push |
| Background | 권한 코멘트만 | **Region Monitoring** OS-level |

---

## 2. 아키텍처 결정 — server-driven vs client-driven

### 2.1 비교

| 항목 | server-driven (초안) | **client-driven (채택)** |
|---|---|---|
| Trip ping API | 30회/trip | **0** |
| Backend push | 2-5회/trip | **0** (local notification) |
| DB writes | 30+ rows/trip | **0** |
| 네트워크 latency | 매 ping round-trip | **즉시 반응** |
| 사용자 위치 server 전송 | 매분 | **0** (privacy ↑) |
| Offline (지하철 등) | 작동 X | **작동** |
| 비용 | DB·push·Anthropic | **0** (Directions API 1회만) |

### 2.2 trip state 위치

trip은 본질적으로 **user device 1개에서만 의미 있음**. 다른 기기에서 봐도 의미 X.
→ `AsyncStorage`(또는 SecureStore) 1개 키 `aura.transit.activeTrip`에 trip JSON 저장.

---

## 3. iOS Background — Region Monitoring(Geofencing)

### 3.1 왜 적합

- 좌표 + radius로 원형 영역 정의 → 진입/탈출 시 OS가 앱을 **깨움 (killed 상태도 OK)**
- 배터리 매우 적게 소모 (CoreLocation 효율 모드)
- 동시 최대 **20개** geofence 등록 가능 — 1 trip에 환승+도착 보통 2-5개. 충분
- 사용자 시나리오와 정확히 매칭

### 3.2 흐름

```
1. 사용자 목적지 검색 → backend Directions → 옵션 N개
2. 사용자가 옵션 선택
3. 클라이언트가 leg별 arrival_stop에 ~150m radius geofence 등록
   (마지막 leg는 도착지에 등록)
4. trip 객체를 AsyncStorage에 저장 (앱 죽어도 OS가 깨우면 복원 가능)
5. OS가 geofence 진입 감지 → 앱 background task로 깨움
6. 앱이 local notification 발송:
   - 환승 leg: "🚇 다음 정거장 환승 — XX역에서 N호선 갈아타세요"
   - 마지막 leg: "🚏 다음 정거장 하차 — XX 도착"
7. 진입한 geofence 제거 + 다음 leg geofence 활성화
8. 모든 leg 완료 → trip cleanup, AsyncStorage clear
```

### 3.3 라이브러리

iOS Region Monitoring을 RN에서 가장 단순하게:
- **`react-native-background-geolocation`** (mauron85 또는 transistorsoft)
  - geofence API 지원 (transition: ENTER/EXIT)
  - 배터리 우선 모드 + adaptive 폴링
  - APN 권한 + Always 권한 필요
- 또는 **`@react-native-community/geolocation` + native module** 직접 wrapping
  - Region Monitoring 자체는 iOS native API
  - 작은 native bridge 작성 필요

**선택**: `react-native-background-geolocation` (transistorsoft) — 검증된 라이브러리,
geofence 지원, RN 0.84 호환. 단 commercial license 검토 필요(open-source 버전 있음).

추후 의존성 평가 후 결정. **Step 5에서 native install** 단계라 그때 결정.

---

## 4. Backend 변경 — 최소 (Directions wrapper만)

### 4.1 신설: `back/src/modules/transit/directions.ts`

- `fetchDirections({originLat, originLng, destination, language, departureTime?})`
  → Google Directions API (transit mode)
- 응답 `routes[].legs[].steps[]`를 우리 schema(NormalizedDirections)로 변환
  - `step.travel_mode === "WALKING"` → `{mode:"walking", duration_sec, polyline}`
  - `step.travel_mode === "TRANSIT"` → `{mode:"transit", transit_kind, line_name,
     line_short, departure_stop:{name,lat,lng}, arrival_stop:{name,lat,lng}, num_stops, polyline}`
- 8초 timeout + try/catch + 빈 fallback (CLAUDE.md 정책)
- Redis 30분 캐시 (key: `transit:directions:{origin_grid}:{dest_hash}:{lang}`)
- usage_events: `transit_directions` feature 키 (사용자별 일일 quota)

### 4.2 신설: `POST /api/v1/transit/directions`

- body: `{ originLat, originLng, destination, language? }`
- resp: `{ options: NormalizedDirectionsOption[] }`
- `requireAuth` 보호

### 4.3 기존 trip ping/push 인프라

- `transit_trips`/`transit_trip_legs` 등 DB 테이블 — **사용 안 함**.
  마이그레이션으로 즉시 drop하지는 않고 다음 cleanup PR에서 정리(downtime 방지).
- `POST /transit/trips`, `/ping` — 그대로 유지하되 frontend에서 호출 안 함.
  cleanup PR에서 제거.

---

## 5. Frontend 변경

### 5.1 신규 화면 — `front/src/features/transit/screens/SearchTrip.tsx`

- 목적지 입력 (TextInput) + 검색 버튼
- 검색 → backend `/transit/directions` 호출 → options 표시
- 옵션 카드: transit chip(line_name) + 시간 + 환승 수 + walking 거리
- 선택 → handler가 `startClientTrip(option)` 호출

### 5.2 신규 모듈 — `front/src/features/transit/client-trip.ts`

```ts
interface ActiveTripState {
  id: string; // 클라이언트 생성 uuid
  destinationLabel: string;
  startedAt: string;
  legs: NormalizedDirectionsOption["legs"];
  currentLegIndex: number;
}

// AsyncStorage key
const ACTIVE_TRIP_KEY = "aura.transit.activeTrip";

// API
loadActiveTrip(): Promise<ActiveTripState | null>
saveActiveTrip(state: ActiveTripState): Promise<void>
clearActiveTrip(): Promise<void>

// Region monitoring 등록/해제
registerLegGeofences(legs): Promise<void>
unregisterAllGeofences(): Promise<void>

// Geofence ENTER 콜백 → local notification + 다음 leg 활성화
onGeofenceEnter(legIndex): Promise<void>
```

### 5.3 ActiveTripBanner 확장

- 단순 stop count → **leg progress**
- 현재 leg: `[2호선 - 잠실 방면] 다음: 강변 (환승)`
- 마지막 leg: `최종 도착까지 약 N분`

### 5.4 TransitModal 분기

- activeTrip 있으면 ActiveTripBanner
- 없으면 SearchTrip(기존 StartTripScreen은 deprecated)

### 5.5 Local notification

- `@react-native-community/push-notification-ios` 이미 의존성 있음 (daily brief 알림 사용 중)
- `PushNotificationIOS.addNotificationRequest({ id, title, body, sound })`로 발송
- background에서 호출 가능 (geofence transition 콜백 안에서)

---

## 6. 단계별 PR (위험도 순)

| Step | 내용 | 의존 | 위험 |
|---|---|---|---|
| **1** | Backend `directions.ts` + `POST /transit/directions` 응답만 | Google API key | 낮 |
| **2** | Frontend `SearchTrip` 검색·옵션 표시 (선택 X, dryRun) | Step 1 | 낮 |
| **3** | `client-trip.ts` AsyncStorage CRUD + ActiveTrip state | — | 낮 |
| **4** | TransitModal 분기 + ActiveTripBanner multi-leg progress | Step 2,3 | 중 |
| **5** | Region Monitoring 의존성(react-native-background-geolocation) + 권한 + geofence 등록 | iOS/Android native build | 큼 |
| **6** | Geofence ENTER → local notification 발송 + 다음 leg 활성화 + cleanup | Step 5 | 중 |
| **7** | (cleanup) backend 기존 trip ping/push 인프라 + DB 테이블 drop | — | 낮 |

각 step 끝나면 typecheck + 시뮬 검증 후 commit. Step 5는 native module 추가라
별도 PR + 명시 권장.

---

## 7. 비용 가드

- **Directions API**: 사용자별 일일 quota (`usage_events` `transit_directions`).
  1트립 = 검색 1-N회 호출. 디바운스 + 명시적 검색 버튼으로 최소화
- **trip ping**: 0 (client only)
- **push 발송**: 0 (local notification)
- **DB write**: 0
- **Redis**: directions cache (30분 TTL, 좌표 1km grid)

→ 사용자 1일 transit trip 평균 2-3회 가정 → directions 호출량 매우 적음. **유일한 backend 비용은 Directions API call**.

---

## 8. Privacy 강점

- 사용자 위치는 **local에만** 저장 (AsyncStorage). 서버 전송 X.
- backend에 남는 transit 흔적은 directions 검색 query뿐(usage_events에 카운트만)
- 사용자가 "Allow Once" 권한도 OK — 단일 trip 동안만 활용. 단 background는 Always 필요

---

## 9. Out of Scope (v2 후보)

- 출발 시점 알림 — 일정 위치 도착 시간 X분 전 "지금 출발하세요"
- delay 감지 — directions 재호출로 ETA 변동 감지
- 도착 후 액션 button — "도착했어요/조금 더 가요"
- Android Geofencing — Android에서도 OS-level geofence(GoogleApiClient) 지원,
  `react-native-background-geolocation`이 통합. iOS와 같은 코드 path
- 다른 device 동기화(여러 폰에서 같은 trip 보기) — 의미 없음, skip
