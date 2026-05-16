# iOS 위젯 — Xcode 수동 setup 가이드

코드는 모두 git에 들어가 있지만 iOS 위젯은 **Xcode UI에서 manual하게 Widget Extension target을 추가**해야 작동합니다. RN 빌드만으로는 위젯이 시스템에 등록되지 않습니다.

> 누락 시 영향: Android 위젯만 동작. iOS 위젯은 홈 화면에 추가되지 않음. 메인 앱은 정상.

---

## 1. Widget Extension target 추가 (Xcode)

1. `front/ios/AuraApp.xcworkspace` 열기
2. 좌측 navigator에서 프로젝트 root(파란 아이콘) 선택 → 하단 **"+"** → **"New Target"**
3. **iOS → Widget Extension** 선택 → Next
4. 입력:
   - Product Name: **`AuraWidget`**
   - Team: 사용자 Apple Developer Team
   - Bundle Identifier: `com.dumbteam.aura.AuraWidget` (자동)
   - Language: **Swift**
   - **"Include Configuration Intent"** 체크 해제 (Static configuration 사용)
5. Finish → Xcode가 "Activate AuraWidget scheme?" 다이얼로그 → **Cancel** (스킴 활성 안 해도 OK)

---

## 2. 자동 생성된 placeholder 파일 제거 + 우리 코드 연결

Xcode가 새 target에 placeholder Swift/Info.plist/Assets를 자동 생성합니다.

1. Project navigator에서 `AuraWidget/` 그룹 펼치기
2. **자동 생성된 Swift 파일 모두 삭제** (`AuraWidget.swift`, `AuraWidgetBundle.swift`, `AuraWidgetLiveActivity.swift` 등이 있으면) — 우측 클릭 → **Delete** → **Move to Trash**
3. **`Info.plist`는 유지** (target에 필수)
4. **`Assets.xcassets`도 유지** (아이콘용)

이제 우리 git에 들어있는 `front/ios/AuraWidget/AuraWidget.swift`를 target에 연결:

1. Project navigator에서 `AuraWidget` 그룹 우클릭 → **Add Files to "AuraApp"...**
2. `front/ios/AuraWidget/AuraWidget.swift` 선택
3. **"Copy items if needed"** 체크 해제
4. **Targets** 섹션에서 **`AuraWidget`만 체크** (메인 앱 X)
5. Add

---

## 3. App Group 설정 (메인 앱 + 위젯 양쪽)

위젯이 메인 앱의 데이터를 읽으려면 같은 App Group을 entitlement에 등록해야 합니다.

### 메인 앱 (AuraApp target)

1. Project navigator에서 프로젝트 root → **AuraApp** target 선택
2. **Signing & Capabilities** 탭
3. **+ Capability** → **App Groups**
4. **+** 버튼 → 그룹 추가 → 이름: **`group.com.dumbteam.aura`**
5. 체크박스 켜짐 확인

### Widget Extension (AuraWidget target)

1. **AuraWidget** target 선택
2. **Signing & Capabilities** 탭
3. **+ Capability** → **App Groups**
4. 기존에 만든 **`group.com.dumbteam.aura`** 체크
5. (필요 시) Apple Developer Console에서 같은 App Group ID로 자동 provision 됨 — Xcode가 처리

---

## 4. Bridge module을 메인 앱 target에 연결

`front/ios/AuraApp/AuraWidgetBridge.swift` + `AuraWidgetBridge.m`은 git에 있지만 Xcode target membership 확인 필요.

1. Project navigator에서 `AuraApp` 그룹 → 두 파일이 보이는지 확인
2. 안 보이면 Add Files... → 두 파일 선택 → Targets에 **AuraApp만 체크**
3. 보이면 각 파일 → File Inspector(우측) → **Target Membership**에 `AuraApp` 체크 확인

---

## 5. Bridging header 확인 (이미 있음)

메인 앱의 `AuraApp-Bridging-Header.h`가 이미 있으므로 `RCTBridgeModule.h` 같은 RN 헤더가 자동 import됨. 추가 작업 불필요.

만약 Swift에서 `import React`가 빨간 줄로 안 잡히면:

- AuraApp target → Build Settings → "Objective-C Bridging Header" 값이 `AuraApp/AuraApp-Bridging-Header.h`인지 확인

---

## 6. 빌드 + 검증

1. Xcode에서 좌측 상단 scheme을 **AuraApp**으로 둠 (위젯 scheme 아님)
2. **Product > Clean Build Folder** (Shift+⌘+K)
3. `cd front/ios && pod install`
4. Run (⌘+R) — 메인 앱 + 위젯이 모두 컴파일되어야 함
5. 시뮬레이터/디바이스 홈 화면 → 위젯 추가 → "AURA 다음 일정" 검색 → 추가
6. 메인 앱 실행 → 일정 탭 → 캘린더 fetch → **위젯이 자동 갱신**

---

## 트러블슈팅

| 증상 | 원인 | 조치 |
|---|---|---|
| 빌드 시 `import WidgetKit` not found | Widget Extension target 누락 | 1번 단계 다시 |
| 위젯이 placeholder("AURA")만 표시, 일정 안 들어옴 | App Group entitlement 미등록 | 3번 단계 양쪽 target에 등록 |
| `setNextEvent` 호출 시 `WIDGET_NO_GROUP` | 같은 원인 — App Group |
| RN console에 `AuraWidget is null` | Bridge 파일이 메인 앱 target에 없음 | 4번 단계 Target Membership 확인 |
| 위젯 검색했는데 "AURA 다음 일정" 안 보임 | 디바이스에 빌드 안 됨 / 캐시 stale | Clean Build + 재실행 + 디바이스에서 앱 한 번 실행 |
| 빌드 통과하지만 위젯이 늦게 갱신 | iOS는 timeline policy + 시스템 budget 제한 | Apple 공식 — 정상. WidgetCenter.reloadTimelines가 즉시 trigger하지만 OS가 batch 가능 |

---

## 코드 위치 정리

| 파일 | target | 역할 |
|---|---|---|
| `front/ios/AuraWidget/AuraWidget.swift` | AuraWidget | TimelineProvider + SwiftUI View + @main Widget |
| `front/ios/AuraApp/AuraWidgetBridge.swift` | AuraApp | RN bridge — UserDefaults App Group 저장 + WidgetCenter reload |
| `front/ios/AuraApp/AuraWidgetBridge.m` | AuraApp | Objective-C extern macro — RN module 등록 |
| `front/src/features/widget/sync.ts` | (RN JS) | calendar agenda → bridge 호출 |
