# AURA · TODO Workflow

다음에 만들 기능을 단계별 실행 가능한 작업으로 분해한 문서. 우선순위는 **사용자 입장에서 최소한의 action** 기준.

---

## 🚌 Bus Arrival Alert (버스 도착 알림)

**시나리오**: 사용자가 캘린더의 다음 일정에 가기 위해 버스를 탔다 → 휴대폰으로 유튜브를 보고 있다 → 도착 1정거장 전 알림이 뜬다 → 내릴 시점을 놓치지 않는다.

### Step 1 · 노선 입력 UX (front)
- 화면: `front/src/features/transit/screens/StartTrip.tsx` (신규)
- 입력: (a) 버스 번호 또는 (b) 출발 정류장 선택
- 캘린더 연동 — 다음 일정의 위치를 자동 채워넣음 (`features/calendar` 활용). 위치가 없으면 사용자에게 직접 입력받기.
- aura-app-design-system의 `chip-tabs`로 이동수단(버스/지하철) 토글, `input` + `search`로 노선 입력.

### Step 2 · 위치 권한 + 백그라운드 추적 (front 네이티브)
- iOS: `Info.plist`에 `NSLocationAlwaysAndWhenInUseUsageDescription` 추가 (현재는 WhenInUseOnly)
- Android: `ACCESS_BACKGROUND_LOCATION` 추가 + Android 10+ 권한 요청 흐름
- 라이브러리: `react-native-background-geolocation` (또는 react-native-location)
- 정확도: 30초/100m 폴링이면 충분. 배터리 영향 분석 필요.

### Step 3 · 노선 데이터 (back 신규 모듈)
- 신규 모듈: `back/src/modules/transit/`
- 외부 API 후보:
  - **공공데이터포털 — 국토교통부 실시간 버스/지하철 정보** (한국 한정, 무료)
  - **TAGO/Topis API**
- 호출 흐름:
  1. 사용자가 "탑승 시작" 버튼 누르면 `POST /api/v1/transit/trips` — 노선/방향/목적지 정류장 저장
  2. 클라이언트가 30초마다 `POST /api/v1/transit/trips/{id}/ping` 으로 GPS 좌표 전송
  3. 서버가 다음 정류장과의 거리, ETA 계산, "남은 정류장 N개" 응답
  4. 임계치(1정거장 전) 도달 시 푸시 발송

### Step 4 · 푸시 알림 (back + front)
- back의 `push_devices` 테이블/jobsService 이미 있음 — 활용
- 알림 카테고리: `bus_arrival_warning` (Action: "지금 내려요" / "10분 뒤 다시")
- iOS Critical Alert 권한도 검토 — 사용자가 음악/유튜브 보고 있을 때 무시되지 않게 sound + vibration 동시
- 화면: aura-app-design-system의 **G. Travel Alert (긴급 출발 알림)** 패턴 재사용 — `chip-urgent` + `t-d1` 큰 타이포

### Step 5 · 배터리/비용 가드
- 30초 폴링이 아닌 **하차 N분 전부터 1분 폴링으로 빈도 점진 증가**.
- 서버는 trip-id별 ETA 캐시 (Redis 60s TTL), 동일 GPS 입력엔 캐시 응답.
- 1트립 = 평균 30분 → 60회 ping → 60회 외부 API 호출 가능. 사용자 1일 2~3 트립 가정 시 OK.
- 외부 API 호출량 모니터링: `usage_events` 테이블에 새 feature 키 `transit_eta` 추가.

### Step 6 · 테스트
- 시뮬레이션: GPS mock으로 정류장별 좌표 시퀀스 입력 후 알림 발송 시점 검증.
- 실주행 테스트(서울 시내 1개 노선) 후 정확도 확인.

---

## 🔁 White-spaces (작은 누적 개선)

| 영역 | 작업 | 우선순위 |
|---|---|---|
| 백엔드 | News 채택률(클릭) 기록 → `users_preferences.newsCategories` 자동 추천 | 낮 |
| 백엔드 | OpenWeatherMap 응답 Redis 캐싱 (좌표 1km 단위 30분 TTL) | 중 |
| 백엔드 | Daily token budget hit alert (관리자용 Slack/Discord webhook) | 중 |
| 프론트 | 다크모드 자동 전환 + 사용자 강제 토글 | 낮 |
| 프론트 | 채팅 답변 시 Anthropic stream API로 토큰 단위 표시 | 중 |
| 프론트 | 푸시 알림 등록 안 한 사용자에게 환영 모달에서 한 번만 권유 | 낮 |
| 인프라 | Sentry 또는 Better Stack 연결 (백/프론트 모두) | 중 |
| 인프라 | Railway 배포 후 Postgres 백업 cron 검증 | 중 |
| 보안 | 5분 윈도우 IP rate limit 추가 (현재는 1분) | 낮 |
| 보안 | OAuth refresh 시도 실패 5회 → 자동 토큰 무효화 + 재로그인 유도 | 중 |

---

## 📦 Future (지금 안 만듦)

- 음성 입력 (Whisper API → Anthropic) — 이동 중 hands-free
- 위젯(iOS/Android) — 홈화면에서 다음 일정 한 줄
- 다국어 확장 (현재 ko/en만)
- 가족 공유 — 부모 일정을 자녀가 받아보기
- "오늘 약속 캐피털" — 오늘 일정 모두 거리/이동시간 합산 → 효율 점수
