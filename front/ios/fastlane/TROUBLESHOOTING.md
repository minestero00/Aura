# Fastlane 빌드 트러블슈팅 노트

이번 (2026-05-13) `fastlane beta` 실행 시 마주친 문제와 해결법 정리. 다음에 같은 함정에 빠지지 않도록 사전 체크 + 흔한 오류별 대응을 모아둠.

## TL;DR — 정상 절차

```bash
cd /Users/riaco/code/dumb/aura/front/ios

# 1) Pod 동기화 (RN codegen 산출물 포함)
BUNDLE_GEMFILE=../Gemfile bundle exec pod install

# 2) TestFlight 베타 배포
BUNDLE_GEMFILE=../Gemfile bundle exec fastlane beta
```

`BUNDLE_GEMFILE=../Gemfile`은 Gemfile이 `front/`에 있고 실행 위치는 `front/ios/`라 명시. 안 붙이면 bundler가 entry Gemfile을 못 찾을 수 있음.

## 필수 사전 조건 (한 번 셋업해두면 OK)

- `front/.env` — `ASC_KEY_ID`, `ASC_ISSUER_ID`
- `front/ios/fastlane/keys/AuthKey.p8` — App Store Connect API Key (gitignored)
- bundler에 fastlane + cocoapods + xcodeproj 설치 (`bundle install`)

## 흔한 오류 → 해결

### 1. `Unable to find compatibility version string for object version '70'`

**원인**: Xcode 26+가 `.pbxproj`를 `objectVersion = 70` 형식으로 저장. CocoaPods의 xcodeproj gem 1.27.0이 이를 인식 못 함.

**해결**: `front/Gemfile`에서 xcodeproj를 GitHub master로 고정 (이미 적용됨):
```ruby
gem 'xcodeproj', git: 'https://github.com/CocoaPods/Xcodeproj', branch: 'master'
```

향후 안정 버전이 release되면 (1.28+) 다시 `>=` 표현으로 돌릴 것.

**증상 보조**: `Pods/Target Support Files/Pods-AuraApp/` 디렉토리가 안 생기거나 비어있음 → `Unable to load contents of file list: '...xcfilelist'` 에러.

### 2. `Unable to load contents of file list ... xcfilelist`

**원인**: pod install이 도중에 깨졌거나 1번 에러의 후속 영향.

**해결**:
```bash
cd front/ios
rm -rf Pods Podfile.lock build
rm -rf ~/Library/Developer/Xcode/DerivedData/AuraApp-*
BUNDLE_GEMFILE=../Gemfile bundle exec pod deintegrate
BUNDLE_GEMFILE=../Gemfile bundle exec pod install
```

### 3. `no such module 'GoogleUtilities'` / `no such module 'RCTSwiftUI'` / `nanopb.modulemap not found`

**원인**: Swift module map이 Pod 빌드 결과물에 없음. `use_modular_headers!`만으로 부족한 일부 target이 있음.

**해결**: Podfile post_install에 DEFINES_MODULE 활성화 (이미 적용됨):
```ruby
if target.name == "RNCPushNotificationIOS" || target.name == "RCTSwiftUI"
  build_configuration.build_settings["DEFINES_MODULE"] = "YES"
end
```

다른 Pod에서 같은 에러가 또 발생하면 그 target 이름을 list에 추가.

### 4. `Invalid Info.plist value. NSExtensionActivationRule ... (90362)` — Upload 단계 실패

**원인**: Share Extension(`AuraCouponShare/Info.plist`)의 `NSExtensionActivationRule`이 `TRUEPREDICATE` 문자열 형식. 디버깅용으로 단순화했을 때 발생. App Store 검증은 **dictionary 형식만** 허용.

**해결**: Info.plist를 dictionary 형식으로:
```xml
<key>NSExtensionActivationRule</key>
<dict>
    <key>NSExtensionActivationSupportsImageWithMaxCount</key>
    <integer>1</integer>
    <key>NSExtensionActivationSupportsWebURLWithMaxCount</key>
    <integer>1</integer>
    <key>NSExtensionActivationSupportsText</key>
    <true/>
</dict>
```

`TRUEPREDICATE`는 시뮬레이터 디버깅 때만 임시로 쓰고, **upload 전에 반드시 dictionary로 복구** 후 빌드.

### 5. `--working-dir` invalid option

**원인**: fastlane 2.230.0은 `--working-dir` 옵션을 인식 못 함.

**해결**: `cd front/ios` 후 `BUNDLE_GEMFILE=../Gemfile bundle exec fastlane beta` 형태로 실행.

### 6. Build number 충돌 / TestFlight latest stale

**해결**:
```bash
BUILD_NUMBER_OVERRIDE=N BUNDLE_GEMFILE=../Gemfile bundle exec fastlane beta
```

`N`은 명시할 build number. ASC에 stuck/processing 빌드 있을 때 사용.

## 빌드 전 사전 체크리스트

- [ ] `front/ios/AuraCouponShare/Info.plist`의 `NSExtensionActivationRule`이 **dictionary** 형식인지 (TRUEPREDICATE 아닌지)
- [ ] `front/Gemfile`의 xcodeproj가 master branch인지
- [ ] AuthKey.p8 + ASC env 셋업되어 있는지
- [ ] 새 native target 추가했다면 main app `General > Frameworks, Libraries, and Embedded Content`에 `.appex` 등록되어 있는지
- [ ] 새 target의 `Signing & Capabilities`에서 App Groups가 **"(Release)"가 아니라 그냥 "App Groups"**로 표시되는지 (Debug + Release 둘 다 적용)

## 위험 신호 → 즉시 정리 후 재시도

빌드가 실패하고 다음 중 하나가 보이면 **Pods 완전 정리** 후 다시 시도:

- `Target Support Files/Pods-AuraApp/` 디렉토리가 비어있거나 일부 파일만 있음
- `Unable to load contents of file list`
- `module map file ... not found`

```bash
cd front/ios
rm -rf Pods Podfile.lock build
rm -rf ~/Library/Developer/Xcode/DerivedData/AuraApp-*
BUNDLE_GEMFILE=../Gemfile bundle exec pod deintegrate
BUNDLE_GEMFILE=../Gemfile bundle exec pod install
BUNDLE_GEMFILE=../Gemfile bundle exec fastlane beta
```

## 빌드 후 정상 사인

```
✅ Successfully exported and signed the ipa file
✅ Successfully uploaded package to App Store Connect
✅ Successfully finished processing the build X.Y - N for IOS
```

위 세 줄이 다 보이면 TestFlight 배포 완료. 몇 분 후 internal testers에게 자동 알림.

## 그룹 attach (필요시)

```bash
BUNDLE_GEMFILE=../Gemfile bundle exec fastlane attach_build \
  group:"외부 테스터 그룹명" version:1.0 build:8
```

`fastlane list_beta_groups`로 그룹/빌드 목록 먼저 확인.
