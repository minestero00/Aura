# iOS Share Extension 설치 가이드 — AuraCouponShare

카카오톡/사진 등에서 이미지를 공유하면 **"Aura - 쿠폰 등록하기"** 가 share sheet에 표시되고, 누르면 AURA가 자동으로 OCR + 추출하여 WalletExtractModal로 사용자에게 확인 받는 기능.

코드는 이미 작성되어 있고, 아래는 **Xcode UI 작업**만 따라하면 됩니다 (약 10분).

---

## 사전 준비

- Apple Developer Program 가입 (개인 무료 계정으로 시뮬레이터 빌드는 가능, 실기기/배포는 유료 필요)
- 이미 main app entitlements에 `group.com.dumbteam.aura` App Group 등록되어 있음 (`AuraApp.entitlements`)

---

## 1단계 — Xcode에서 Share Extension target 추가

1. `front/ios/AuraApp.xcworkspace`를 Xcode로 연다 (`.xcodeproj` 아님)
2. Project Navigator에서 `AuraApp` 프로젝트 선택 (가장 위 파란 아이콘)
3. **File > New > Target...** (또는 Targets 영역 아래 `+` 버튼)
4. iOS 카테고리에서 **"Share Extension"** 선택 → **Next**
5. 입력:
   - **Product Name**: `AuraCouponShare`
   - **Team**: 본인 Apple Developer Team
   - **Organization Identifier**: `com.dumbteam` (자동 채워짐 — Bundle ID는 `com.dumbteam.aura.AuraCouponShare`가 됨)
   - **Language**: **Swift**
   - **Embed in Application**: `AuraApp`
6. **Finish** → "Activate scheme?" 다이얼로그가 뜨면 **Cancel** (main app scheme 유지)

---

## 2단계 — Xcode가 자동 생성한 파일 교체

Xcode가 `front/ios/AuraCouponShare/` 폴더에 다음 파일들을 자동 생성합니다:
- `ShareViewController.swift`
- `MainInterface.storyboard`  
- `Info.plist`

**작업**:
1. Finder에서 `front/ios/AuraCouponShare/`로 이동
2. 미리 작성된 `ShareViewController.swift`, `Info.plist`, `AuraCouponShare.entitlements`가 보입니다
3. Xcode가 만든 파일과 충돌하면 **Xcode 생성본을 삭제** (Move to Trash) 후 **미리 작성된 파일을 다시 add**
   - Xcode에서 `AuraCouponShare` group 우클릭 → "Add Files to AuraApp..." → 세 파일 선택
4. `MainInterface.storyboard`는 **삭제** — 사용 안 함 (코드 only)
5. Xcode `AuraCouponShare` target의 **Info** 탭에서 `NSExtension > NSExtensionMainStoryboard` 키가 있으면 삭제 (Info.plist에 이미 `NSExtensionPrincipalClass`로 대체)

---

## 3단계 — App Groups capability 추가

Share Extension에서 main app과 데이터를 공유하려면 둘 다 같은 App Group이 필요합니다.

1. Project Navigator에서 `AuraApp` 프로젝트 선택
2. 좌측 Targets에서 **`AuraCouponShare`** 선택
3. **Signing & Capabilities** 탭
4. **+ Capability** 클릭 → **App Groups** 선택
5. App Group 목록에서 `group.com.dumbteam.aura` 체크 (이미 main app 용으로 등록되어 있음. 없다면 `+`로 추가)
6. **Signing** 섹션에서 **Team** 선택 (main app과 동일)

---

## 4단계 — Entitlements 파일 적용

1. Targets에서 `AuraCouponShare` 선택 → **Build Settings**
2. 검색창에 `entitlements` 입력
3. **Code Signing Entitlements** 키 값을 `AuraCouponShare/AuraCouponShare.entitlements`로 설정

(미리 작성된 entitlements 파일에 App Group이 명시되어 있음 — 3단계가 잘 됐다면 자동으로 채워질 수도 있음)

---

## 5단계 — AuraShareReceiver native module을 main app에 추가

Main app에서 share 데이터를 RN으로 전달하는 native module입니다.

1. `front/ios/AuraApp/AuraShareReceiver.swift` 및 `AuraShareReceiver.m` 파일이 이미 작성되어 있음
2. Xcode에서 `AuraApp` group 우클릭 → "Add Files to AuraApp..." → 두 파일 선택
3. **중요**: "Add to targets" 체크박스에서 **`AuraApp`만 체크** (AuraCouponShare 체크 해제)

---

## 6단계 — 빌드 & 시뮬레이터 테스트

```bash
cd front
npx pod-install ios   # CocoaPods 동기화 (선택 사항)
npx react-native run-ios
```

또는 Xcode에서 직접:
- Scheme: `AuraApp`
- iPhone 17 Pro 시뮬레이터 선택
- ⌘R

**테스트**:
1. AURA 앱 한 번 실행 (Share Extension은 main app 설치 후에만 share sheet에 노출됨)
2. 시뮬레이터의 Photos 앱 → 아무 이미지 → 공유 버튼 → **"Aura - 쿠폰 등록하기"** 가 보이면 성공
3. 누르면 AURA로 전환 + WalletExtractModal이 자동으로 떠야 함

---

## 트러블슈팅

| 증상 | 원인 / 해결 |
|------|------------|
| Share sheet에 안 보임 | Main app 한 번 실행 안 함, 또는 Bundle ID 충돌 — Xcode에서 빌드 로그 확인 |
| App Group access denied | 3단계 capability 누락 또는 entitlements 파일 미적용 (4단계) |
| 클릭해도 main app이 안 열림 | `Info.plist` 의 URL Scheme `aura` 등록 확인 (이미 작성됨) |
| OCR 결과 없음 | 시뮬레이터의 native OCR이 약함 — 실기기 권장 |

---

## 작업 완료 후 commit할 파일

```
front/ios/AuraCouponShare/
front/ios/AuraApp/AuraShareReceiver.swift
front/ios/AuraApp/AuraShareReceiver.m
front/ios/AuraApp/AppDelegate.swift  (URL scheme handling)
front/ios/AuraApp/Info.plist          (aura:// URL Type)
front/ios/AuraApp.xcodeproj/project.pbxproj  (Xcode가 자동 수정)
front/src/features/wallet/share-receiver.ts
front/src/features/app/hooks/use-aura-app.ts  (handleShareCouponImage)
front/src/features/app/screens/app-shell.tsx (useEffect listening)
front/src/features/app/types.ts
front/src/features/app/hooks/use-aura-app/result.ts
```

`.pbxproj`는 Xcode가 target 추가 시 자동으로 수정합니다.
