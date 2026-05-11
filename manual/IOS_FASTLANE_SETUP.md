# iOS Fastlane — TestFlight 배포 자동화

`bundle exec fastlane beta` 한 명령으로:
1. TestFlight 최신 빌드 번호 + 1로 자동 bump
2. Archive (App Store distribution)
3. TestFlight 업로드

처리 후 internal testers는 즉시 새 빌드 사용 가능.

---

## 1. App Store Connect API Key 발급 (한 번만)

1. https://appstoreconnect.apple.com → Users and Access → **Integrations** 탭 → **App Store Connect API**
2. 우측 상단 **"Generate API Key"** 또는 **"+"**
3. 입력:
   - **Name**: `AURA Fastlane`
   - **Access**: **App Manager** (또는 더 좁게 `Developer`도 가능)
4. **Generate** 클릭
5. 생성된 키 행에서:
   - **Key ID** (10자리) 메모 — 다음 단계 환경변수에 사용
   - **Issuer ID** (UUID, 페이지 상단) 메모
   - **"Download API Key"** 클릭 → `.p8` 파일 다운로드 (**한 번만 가능 — 잃어버리면 revoke + 재발급**)

## 2. .p8 파일 위치

다운로드 받은 `AuthKey_<KEY_ID>.p8`을 다음 경로에 저장:

```
front/ios/fastlane/keys/AuthKey.p8
```

(파일명은 `AuthKey.p8`로 통일 — Fastfile이 그 이름을 default로 찾음.)

> ⚠️ 이 폴더는 `.gitignore`에 등록되어 있어 commit되지 않습니다. 절대 git에 올리지 마세요.

## 3. 환경변수 설정

`front/.env`에 추가 (기존 변수 아래):

```bash
ASC_KEY_ID=ABC1234DEF             # 10자리
ASC_ISSUER_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx  # UUID
# ASC_KEY_FILEPATH는 안 적으면 front/ios/fastlane/keys/AuthKey.p8 자동 사용
```

또는 shell에서 export (CI에서 권장):

```bash
export ASC_KEY_ID=ABC1234DEF
export ASC_ISSUER_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

## 4. 배포 실행

```bash
cd front/ios
bundle exec fastlane beta
```

소요 시간:
- Build number 조회 + Archive: 5~10분
- Upload: 1~3분
- Apple TestFlight 처리: 10~30분 (이 시간 동안 빌드 status `Processing`)
- 처리 완료 후 Internal testers에게 자동 알림

## 5. dry-run (실제 배포 안 하고 확인만)

```bash
cd front/ios
bundle exec fastlane next_build
```

→ "다음 build number는 N입니다" 출력만. archive/upload 안 함.

---

## 트러블슈팅

### `Could not find App Store Connect API key`
환경변수 누락. `ASC_KEY_ID`와 `ASC_ISSUER_ID` 둘 다 export 되어 있는지 확인.

### `Could not find file: AuthKey.p8`
`.p8` 파일이 `front/ios/fastlane/keys/AuthKey.p8` 경로에 있는지 확인. 또는 `ASC_KEY_FILEPATH` 환경변수로 다른 경로 지정.

### `An app with this bundle identifier ... is not yet on App Store Connect`
TestFlight 첫 배포 시 — App Store Connect → My Apps → **"+ New App"** 으로 앱 등록 필수.
- Platform: **iOS**
- Name: `AURA`
- Primary Language: `Korean`
- Bundle ID: `com.dumbteam.aura`
- SKU: 임의 (예: `aura-001`)
- User Access: Full Access

등록 후 다시 `fastlane beta` 실행.

### `No certificate matching ...`
시그닝 인증서 누락. 일단 Xcode에서 manual archive 한 번 시도해서 인증서 발급 받기 또는 Fastlane Match 도입.

### Build number conflict
`latest_testflight_build_number`가 latest를 못 찾으면 `initial_build_number: 0`을 시작점으로 사용. 이미 TestFlight에 1.0 (build 2)가 있으면 build 3으로 자동 이동.

---

## 다음 단계 (옵션)

- **Match 도입**: 인증서/프로비저닝 프로파일을 private git repo에 암호화 보관 → 팀 멤버 공유 가능
- **GitHub Actions**: Tag push 시 자동 fastlane beta 실행 (macOS runner 필요)
- **Android Fastlane**: `front/android/fastlane/Fastfile`로 Google Play Internal Testing 동시 배포
