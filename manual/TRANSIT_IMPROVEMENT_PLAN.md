# Transit (정류장 도착 알림) 개선 계획

작성: 2026-05-14

## 배경

- 사용자 보고: **앱이 background에 있을 때 도착 알림이 안 옴**.
- 사용자 보고: **검색 UI가 너무 빈약** — 검색 결과를 지도로 확인하는 단계가 없음.
- 본 문서는 (1) background 알림 실패의 의심 원인 5개와 fix 우선순위, (2) UI 개선안을 정리한다.

## 현재 아키텍처 요약

```
[사용자 검색] → POST /transit/directions (Google Directions)
              → 경로 옵션 카드 list (텍스트만, 지도 없음)
              → 옵션 선택 → AsyncStorage activeTrip 저장
              → ClientActiveTripBanner mount
              → useGeofenceTracker:
                  · foreground: 3s polling (AppState=active일 때만)
                  · background: native CLCircularRegion/GeofencingClient ENTER 이벤트
              → ENTER 발화 → native가 직접 local notification 표시
```

핵심 파일:
- RN: `front/src/features/transit/screens/SearchTrip.tsx`, `client-trip/ClientActiveTripBanner.tsx`, `hooks/use-geofence-tracker.ts`, `native-geofence.ts`, `notifications.ts`
- iOS: `front/ios/TransitGeofence.swift`
- Android: `front/android/app/src/main/java/com/dumbteam/aura/transit/{TransitGeofenceModule,GeofenceBroadcastReceiver}.kt`
- Backend: `back/src/modules/transit/routes.ts` (검색만, push 발송 없음 — client-driven)

## Part 1 — Background 알림 실패 분석

### P0-1. iOS "When in Use" 권한 상태

**증상**: 앱 background 진입 → 도착해도 알림 없음.

**원인**: `TransitGeofence.swift:48` `requestAlwaysAuthorization()`이 trip 시작 시 호출되지만, 사용자가 "When in Use"로만 허용했으면 region monitoring은 background에서 작동하지 않는다. iOS는 in-app에서 "When in Use → Always"로 자동 upgrade 못 함 (사용자가 Settings에서 직접 변경해야).

**현재 코드**: `use-geofence-tracker.ts:215` AppState 변경 시 다시 시도하지만 권한이 그대로면 무의미. UI는 `helperBackgroundLimit` 문구로 안내하지만 사용자가 이게 어떻게 해결되는지 못 알아챌 가능성.

**해결책**:
1. `TransitGeofence.swift`에 `getAuthorizationStatus()` 노출 (`@authorizationStatus`) → RN이 query 가능.
2. Trip 시작 직후 status 체크. "When in Use"면 alert: "AURA가 백그라운드에서도 알리려면 위치를 '항상 허용'으로 바꿔야 해요" + "설정 열기" 버튼.
3. ClientActiveTripBanner에 권한 상태를 **빨간 배지**로 명확히 표시 (현재 helper text는 무시되기 쉬움).

### P0-2. Android Doze 모드 + 배터리 최적화

**증상**: 화면 끄고 충전 안 한 상태에서 도착해도 알림 지연 (수 분~수십 분) 또는 누락.

**원인**: Android 6.0+ Doze에서 geofence는 시스템 최적화 대상. AURA가 배터리 최적화 목록에서 제외되지 않으면 wake-up 지연. `front/android/...` 어디에도 `REQUEST_IGNORE_BATTERY_OPTIMIZATIONS` 요청 없음.

**해결책**:
1. `AndroidManifest.xml`에 `<uses-permission android:name="android.permission.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS" />` 추가.
2. Native module에 `requestIgnoreBatteryOptimizations()` method — Settings의 `ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS` intent 실행.
3. Trip 시작 시 한 번 사용자에게 "정확한 도착 알림을 위해 배터리 최적화 제외 필요" dialog + 버튼.
4. 보완: 일부 OEM(샤오미, 화웨이)은 별도 "자동 시작 허용" 설정 필요 — manual에 안내문 추가.

### P1-1. Notification 권한 race condition (iOS)

**증상**: 첫 trip 시작 직후, 권한 dialog 보기 전에 geofence ENTER가 발화하면 알림 못 표시.

**원인**: `use-geofence-tracker.ts:180~189` `ensureTransitNotificationPermission()` 호출은 비동기. trip 시작 직후 빠르게 region 도달 시 race.

**해결책**: trip 시작 함수에서 권한 `await` 후 진행. 권한 거부면 시작 중단 + 안내.

### P1-2. Native 등록 실패 silent

**증상**: `startBackgroundMonitoring()` 실패해도 사용자가 모름. UI에 명확한 단서 없음.

**원인**: 
- iOS `TransitGeofence.swift:43~84` error handling 부재.
- Android `addOnFailureListener` (Module:89) reject만, 사용자에게 노출 없음.
- `subscribeBackgroundError()` (native-geofence.ts:64~70) 정의는 있지만 호출처 없음.

**해결책**:
1. native에서 `code` field로 분기 가능한 error 반환 (`E_PERMISSION_DENIED`, `E_PLAY_SERVICES_MISSING`, `E_REGION_LIMIT_EXCEEDED` 등).
2. `subscribeBackgroundError()` 실제 사용 — Banner에 error message 표시.
3. iOS region monitoring limit (앱당 20개) 초과 시 우선순위로 prune.

### P2. Foreground polling 중단 후 double failure

**증상**: 사용자가 background로 전환했는데 native도 실패한 경우 알림 전무.

**원인**: `use-geofence-tracker.ts:338` AppState!=active이면 stopPolling. native가 동작 안 하면 백업 없음.

**해결책**: native 등록 실패 또는 권한 부족 상황에서는 background에서도 일정 시간 polling 유지 (충전 중일 때만 등 조건 추가하면 배터리 우려도 줄임).

### 우선순위 매트릭스

| Priority | 분류 | 영향도 | 작업량 |
|----------|------|--------|--------|
| P0-1 | iOS Always 권한 강제 UX | 높음 | 중 (native + UI) |
| P0-2 | Android battery opt-out | 높음 | 중 (manifest + native + UI) |
| P1-1 | iOS notification race | 중 | 작음 (await) |
| P1-2 | Native error 가시화 | 중 | 중 (양쪽 native 갱신) |
| P2 | Background fallback polling | 낮음 | 작음 |

## Part 2 — UI 개선안

### A. 검색 → 지도 확인 단계 (사용자 요청)

**현재**: TextInput → 결과 카드 list. 사용자는 "내가 가려는 곳이 정말 이 정류장인지" 확신 어려움.

**개선**:
1. 검색 결과 옵션 카드 탭 → **지도 모달** 열림 (`react-native-maps` 또는 `Mapbox` SDK).
2. 지도에 표시:
   - 현재 위치 (파란 dot)
   - 출발지 (출발 정류장 marker)
   - 도착지 (목적지 marker)
   - 경로 polyline (Directions API의 `overview_polyline` decode)
3. 지도 위 카드: "이 경로 사용" + "다른 경로 보기" + "취소".
4. iOS Apple Maps native overlay 사용 가능 (외부 dep 0).

**구현 노트**:
- `react-native-maps` 도입 시 추가 native pod + Android dependency. 의존성 신중.
- 대안: `react-native-mapbox-gl/maps` (벡터 타일, 빠름) 또는 native Apple Maps wrapper.
- Directions API의 polyline encoded 문자열을 `@mapbox/polyline` 같은 lib로 decode.

### B. Trip 진행 중 라이브 시각화

**현재**: 텍스트 banner — "현재: 강남역 → 다음: 역삼역, 800m 남음".

**개선**:
1. 진행 중 trip을 **mini map** + **progress bar** 형태로:
   - 출발 → 중간 정류장들 → 도착의 horizontal stepper
   - 현재 leg의 진행률 (0~100%)
   - 다음 정류장까지 ETA + 거리
2. 정류장 카드 위에 작은 지도 — 현재 위치 dot + 다음 정류장 marker.

### C. 권한/배터리 안내 일관화

**현재**: `helperBackgroundLimit` 문구를 helper text로만 표시. 사용자가 그냥 지나침.

**개선**:
1. Trip 시작 시 권한 상태 점검 결과를 **단계별 체크리스트**로:
   - ✓ 위치 권한 (When in Use 또는 Always)
   - ✓ "항상 허용" 권한 (background용)
   - ✓ 알림 권한
   - ✓ 배터리 최적화 제외 (Android)
   하나라도 ✗이면 해당 step의 fix 버튼 prominent하게 표시.
2. Settings deep link + native dialog.

### D. 정류장 검색 UX 강화

**현재**: 자유 텍스트 입력 → Directions API 호출.

**개선**:
1. 검색어 debounce + autocomplete (Google Places API).
2. 최근 검색 기록 (AsyncStorage).
3. 자주 가는 곳 (홈, 직장, 캘린더 이벤트 장소) 빠른 선택 chip.
4. 입력 중 지도에 후보 marker preview.

### E. Trip 종료 후 회고

**현재**: trip 종료 → state cleared. 데이터 미보존.

**개선** (선택):
1. 최근 trip 기록을 AsyncStorage에 N개 보존 (개인 데이터, server 동기화 X).
2. "오늘 이동": 시간/거리 요약.

### F. 알림 자체의 정보 강화

**현재**: "AURA 도착 알림" + "강남역에 도착했어요" 정도.

**개선**:
1. 알림 메시지에 다음 정류장 자동 안내 ("다음: 역삼역, 5분").
2. iOS rich notification — 작은 지도 이미지 첨부.
3. Action button: "내렸어요" → 자동 trip advance.

## Part 3 — 구현 순서 제안

### Sprint 1 (가장 critical, 1~2일)
1. P0-1 iOS Always 권한 UX 강화
2. P0-2 Android battery opt-out flow
3. P1-1 notification permission await
4. UI C (권한 체크리스트)

### Sprint 2 (UI 강화, 2~3일)
5. UI A (검색 → 지도 확인) — react-native-maps 도입
6. P1-2 native error 가시화 + `subscribeBackgroundError` 활용
7. UI F.3 (알림 action button)

### Sprint 3 (확장, 1~2일)
8. UI B (라이브 mini map)
9. UI D (자주 가는 곳, autocomplete)
10. P2 fallback polling
11. UI E (trip 기록 — 선택)

## Part 4 — 결정 필요 항목

- [ ] 지도 SDK 선택: `react-native-maps` (Google Maps backed, 안정), `Mapbox` (커스텀 design 좋음, 토큰 발급), native Apple Maps wrapper (iOS only)?
- [ ] Battery optimization exemption 요청을 trip 시작 시마다? 첫 trip 시작 후 한 번?
- [ ] Trip 기록(UI E)을 client-only로 둘지, backend에 별도 저장할지 (현재 server는 client-driven 정책)?

## Part 5 — 참고: 알려진 OS 제약

### iOS
- Region monitoring: 앱당 최대 **20개**. 초과 시 silently rotate.
- `allowsBackgroundLocationUpdates`는 region monitoring과 별개. Region은 자동.
- Always 권한 거부 시 in-app 재요청 불가, Settings 유도만.
- Background mode `location`이 Info.plist에 있어야 함 (✓ 현재 있음).

### Android
- Geofence: 앱당 100개 (충분).
- Doze 모드, App Standby, OEM 자체 최적화(샤오미 등) 영향.
- Android 10+ ACCESS_BACKGROUND_LOCATION은 in-app 요청 불가, Settings 유도.
- Foreground service 도입 시 알림 상시 표시 부담 (UX 호불호) — 현재 미사용.

---

문서 끝.
