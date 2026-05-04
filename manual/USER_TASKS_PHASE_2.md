# 🧑 사용자 작업 가이드 — Phase 2 (Supabase Auth + 4가지 로그인)

이 문서는 **사용자(=당신)가 손으로 직접 해야 하는 모든 작업**을 순서대로 정리한 것입니다.

> 코드 작업은 모두 끝났습니다 (commit `80bda6e` 이후 추가 commit 예정). 이 문서의 작업을 다 마치면 모바일 앱에서 4가지 방식(Google / Kakao / 휴대전화 OTP / Dumb 이메일)으로 로그인 가능해집니다.

전체 소요 시간: **2~3시간** (Kakao 비즈니스앱 검수 신청은 별도 — 1~2주 백그라운드 대기).

---

## 0. 진행 순서 한눈에

```
A. Supabase 프로젝트 키 수집 (5분)
B. Google OAuth — Supabase Auth provider 설정 (10분)
C. Kakao Developers 앱 + Supabase Auth provider (30분)
D. 한국 SMS provider 가입 + Supabase Phone Auth (30분)
E. 백엔드 환경변수 입력 + 재배포 (15분)
F. 모바일 앱 .env 채우기 (5분)
G. iOS 네이티브 설정 (Xcode, 20분)
H. Android 네이티브 설정 (Android Studio, 20분)
I. 동작 테스트 (30분)
J. (별도 진행) Kakao 비즈니스앱 검수 — 1~2주
```

---

## A. Supabase 프로젝트 키 수집 (5분)

**대상 프로젝트**: `ecommerce-dumb's Project` (id: `rfxvaektikhjrfiphkgz`, region: ap-northeast-2 Seoul)

[Supabase Dashboard](https://supabase.com/dashboard/project/rfxvaektikhjrfiphkgz) → **Project Settings → API** 에서:

| 라벨 | 어디에 쓰나 |
|---|---|
| **Project URL** (`https://rfxvaektikhjrfiphkgz.supabase.co`) | `SUPABASE_URL` (백엔드 + 모바일 둘 다) |
| **anon / public key** (`eyJhbGc...`) | 모바일 `SUPABASE_ANON_KEY` |
| **service_role key** ⚠️ 비밀 | 백엔드 `SUPABASE_SERVICE_ROLE_KEY` |
| **JWT Secret** (Settings → API → "JWT Settings") | 백엔드 `SUPABASE_JWT_SECRET` |

**비밀번호는 1Password/Bitwarden 같은 비밀 관리자에만**.

---

## B. Google OAuth — Supabase Auth provider (10분)

dumb 프로젝트에 이미 7명의 Google OAuth 사용자가 있으니 **현재 dumb이 쓰고 있는 Google OAuth Client를 재사용**합니다 (그대로 가면 dumb 사용자가 AURA에서 같은 계정으로 로그인됨).

1. [Supabase Dashboard](https://supabase.com/dashboard/project/rfxvaektikhjrfiphkgz/auth/providers) → **Authentication → Providers → Google**
2. 이미 활성화되어 있으면 그대로 둡니다 (dumb이 이미 사용 중)
3. **Client IDs** 탭에 **iOS / Android / Web client_id** 모두 입력되어 있어야 모바일 네이티브 사인인이 동작합니다 (모바일 SDK가 idToken을 발급할 때 사용한 client가 Supabase에 등록되어 있어야 통과)
4. 누락된 게 있으면 [Google Cloud Console](https://console.cloud.google.com/apis/credentials) → 해당 OAuth client에서 **Client ID** 복사 후 Supabase에 추가

---

## C. Kakao Developers 앱 + Supabase Auth provider (30분)

### C-1. Kakao 앱 만들기

1. [Kakao Developers](https://developers.kakao.com/console/app) → **내 애플리케이션 → 애플리케이션 추가하기**
   - 앱 이름: `AURA` (한국어 가능)
   - 사업자명: 본인/법인명
2. 만들고 나면 **앱 키** 4개가 나옴. 다음 두 개를 메모:
   - **네이티브 앱 키** → 모바일 `KAKAO_NATIVE_APP_KEY`
   - **REST API 키** → Supabase Auth의 Kakao provider에 입력
3. **앱 설정 → 플랫폼** 으로 이동, 두 플랫폼 모두 추가:
   - **iOS**:
     - Bundle ID: `com.your-team.aura` (Xcode에서 production 으로 설정한 값)
   - **Android**:
     - 패키지명: `com.aura.app` (또는 production AndroidManifest의 package)
     - 키 해시: production keystore의 SHA-1 → 카카오가 요구하는 base64 형태로 변환
     - 변환 명령:
       ```bash
       keytool -exportcert -alias <your-alias> -keystore <release.keystore> | openssl sha1 -binary | openssl base64
       ```

### C-2. Kakao 동의항목 설정

**제품 설정 → 카카오 로그인** 활성화 후 **동의항목**으로 이동.

⚠️ **카카오 정책**: 일반 앱은 **닉네임 + 프로필 사진**만 받을 수 있습니다. 이메일·휴대전화 등은 **모두 비즈앱 검수 통과 필수**.

| 항목 | 일반 앱 | 비즈앱 (검수 후) |
|---|---|---|
| 닉네임 (`profile_nickname`) | ✅ 필수 동의 | |
| 프로필 사진 (`profile_image`) | ✅ 선택 동의 | |
| 카카오계정(이메일) (`account_email`) | ❌ | ✅ |
| 카카오계정(전화번호) (`phone_number`) | ❌ | ✅ |
| 성별/생년월일/연령대 | ❌ | ✅ |

**MVP 전략**: 카카오 로그인 버튼은 코드에 살아있지만 `KAKAO_LOGIN_ENABLED=false`로 가드되어, 사용자가 누르면 "현재는 카카오 로그인을 준비 중입니다" 메시지만 표시됩니다. **이메일을 받지 못하면 dumb 사용자와 SSO 매칭 불가**라서 검수 통과 전에 활성화하면 같은 사람이 두 계정으로 분리됩니다.

→ 비즈앱 검수 신청은 **지금 시작** (J 단계). 통과 후 동의항목에 이메일 추가 + `.env`의 `KAKAO_LOGIN_ENABLED=true` 한 줄만 바꾸면 즉시 활성화.

### C-3. OpenID Connect 활성화 (Supabase 통합 필수)

**제품 설정 → 카카오 로그인 → OpenID Connect 활성화 ON**.

Supabase Auth는 Kakao를 idToken 기반으로 받으므로 OIDC가 켜져있어야 합니다. 안 켜면 코드의 Kakao 핸들러가 `KAKAO_NO_ID_TOKEN` 에러를 던집니다.

### C-4. Redirect URI 등록

**제품 설정 → 카카오 로그인 → Redirect URI** 에 다음 추가:
```
https://rfxvaektikhjrfiphkgz.supabase.co/auth/v1/callback
```

### C-5. Supabase에 Kakao provider 활성화

Supabase Dashboard → **Authentication → Providers → Kakao**:
- **Enabled** ON
- **Client ID** = Kakao **REST API 키**
- **Client Secret** = Kakao **앱 설정 → 보안 → Client Secret 코드** (없으면 "코드 발급" 누른 뒤 사용 상태 ON)
- **Save**

---

## D. 한국 SMS provider 가입 + Supabase Phone Auth (30분)

### D-1. SMS provider 선택

| Provider | 한국 발송 비용 | 가입 난이도 | 권장 |
|---|---|---|---|
| **Coolsms** ([Nurigo](https://nurigo.net/)) | 건당 ~10원 | 사업자 인증 필요 | ✅ 가장 저렴 |
| **Aligo** ([Aligo](https://smartsms.aligo.in/)) | 건당 ~10원 | 사업자 인증 필요 | ✅ |
| **Twilio** | 건당 ~$0.075 (~100원) | 카드만 있으면 즉시 | 글로벌만 |

> Coolsms 권장. 가입 후 발신번호 등록 (사업자등록증 또는 본인 휴대폰 인증 필요).

### D-2. Supabase Phone Auth 활성화

Supabase Dashboard → **Authentication → Providers → Phone**:
- **Enabled** ON
- **SMS Provider**: 위에서 가입한 provider 선택
- **API key / API secret**: provider에서 발급받은 값
- **Sender ID** (Coolsms는 "발신번호") 입력
- **OTP Length**: 6
- **OTP Expiry**: 600 (10분)
- **Save**

### D-3. SMS 템플릿 (선택)

Supabase Dashboard → **Authentication → Templates → Phone confirm** 에 한국어 메시지로 변경 권장:
```
[AURA] 인증번호: {{ .Code }} (10분 안에 입력)
```

---

## E. 백엔드 환경변수 입력 + 재배포 (15분)

Railway 또는 K8s를 사용 중이면 다음 변수 추가/수정:

```bash
# A에서 수집한 값
SUPABASE_URL=https://rfxvaektikhjrfiphkgz.supabase.co
SUPABASE_JWT_SECRET=<JWT Settings에 표시된 값>
SUPABASE_SERVICE_ROLE_KEY=<service_role key>

# 기존 Postgres URL을 Supabase 것으로
DATABASE_URL=postgresql://postgres.rfxvaektikhjrfiphkgz:<DB-PASSWORD>@aws-0-ap-northeast-2.pooler.supabase.com:5432/postgres
DATABASE_SSL=true
```

> DATABASE_URL의 `<DB-PASSWORD>` 자리는 Supabase Project Settings → Database → "Connection string"에서 확인 (또는 처음 프로젝트 만들 때 입력한 비밀번호 — 분실 시 재설정).

기존 환경변수는 그대로 (Anthropic, Google Maps, OpenWeather 등). 재배포 후:

```bash
curl https://your-railway-url/api/v1/health/ready
# {"ok":true,"dependencies":{"postgres":"ok","redis":"ok"}}
```

---

## F. 모바일 앱 .env 채우기 (5분)

`front/.env` 새로 만들거나 수정:

```bash
API_BASE_URL_IOS=https://your-railway-url
API_BASE_URL_ANDROID=https://your-railway-url

SUPABASE_URL=https://rfxvaektikhjrfiphkgz.supabase.co
SUPABASE_ANON_KEY=<anon key — A에서 수집>

# 기존 그대로 (dumb의 Google OAuth client)
GOOGLE_WEB_CLIENT_ID=...
GOOGLE_IOS_CLIENT_ID=...
GOOGLE_ANDROID_CLIENT_ID=...
GOOGLE_IOS_URL_SCHEME=...

# C-1에서 받은 네이티브 앱 키 (REST API 키 아님). 비즈앱 검수 전이라도 미리 채워둘 것.
KAKAO_NATIVE_APP_KEY=

# 비즈앱 검수 통과 후 true 로 변경. 그 전엔 카카오 버튼이 "준비 중" 메시지만 표시.
KAKAO_LOGIN_ENABLED=false
```

---

## G. iOS 네이티브 설정 (Xcode, 20분)

### G-1. Kakao URL Scheme 추가

`front/ios/AuraApp/Info.plist` 열고 `<dict>` 안에 추가:

```xml
<key>LSApplicationQueriesSchemes</key>
<array>
  <string>kakaokompassauth</string>
  <string>kakaolink</string>
  <string>kakaotalk</string>
  <string>kakaoplus</string>
</array>
<key>KAKAO_APP_KEY</key>
<string>$(KAKAO_NATIVE_APP_KEY)</string>
```

`CFBundleURLTypes` 배열 안에 추가 (이미 Google URL scheme이 있을 가능성):

```xml
<key>CFBundleURLTypes</key>
<array>
  <!-- 기존 Google scheme 유지 -->
  <dict>
    <key>CFBundleURLSchemes</key>
    <array>
      <string>kakao$(KAKAO_NATIVE_APP_KEY)</string>
    </array>
  </dict>
</array>
```

> **`$(KAKAO_NATIVE_APP_KEY)` 변수**는 Xcode `Build Settings → User-Defined`에 등록하세요 (값 = F의 KAKAO_NATIVE_APP_KEY 그대로). 또는 빠르게 진행하려면 `kakao{실제키값}` 으로 그냥 박아도 됩니다.

### G-2. AppDelegate 수정 (Kakao SDK URL handler)

`front/ios/AuraApp/AppDelegate.swift` (또는 `.mm`):

```swift
import KakaoSDKCommon
import KakaoSDKAuth

// application(_:didFinishLaunchingWithOptions:) 안에 추가:
KakaoSDK.initSDK(appKey: Bundle.main.object(forInfoDictionaryKey: "KAKAO_APP_KEY") as? String ?? "")

// 새 메서드 추가:
func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey : Any] = [:]) -> Bool {
  if AuthApi.isKakaoTalkLoginUrl(url) {
    return AuthController.handleOpenUrl(url: url)
  }
  return false
}
```

### G-3. Pod install

```bash
cd front/ios && pod install && cd ..
```

### G-4. 권한 텍스트는 변경 없음

Phone OTP는 SMS를 받기만 하므로 별도 권한 불필요.

---

## H. Android 네이티브 설정 (20분)

### H-1. AndroidManifest.xml 수정

`front/android/app/src/main/AndroidManifest.xml` `<application>` 안에 추가:

```xml
<!-- Kakao Auth callback -->
<activity
  android:name="com.kakao.sdk.auth.AuthCodeHandlerActivity"
  android:exported="true">
  <intent-filter>
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <!-- "kakao{KAKAO_NATIVE_APP_KEY}" — 키값 그대로 박아주세요 -->
    <data android:host="oauth"
          android:scheme="kakao12345abcde" />
  </intent-filter>
</activity>

<meta-data
  android:name="com.kakao.sdk.AppKey"
  android:value="@string/kakao_app_key" />
```

`front/android/app/src/main/res/values/strings.xml`:

```xml
<resources>
  <string name="app_name">AURA</string>
  <string name="kakao_app_key">12345abcde</string>  <!-- KAKAO_NATIVE_APP_KEY -->
</resources>
```

### H-2. Gradle 변경 없음

`@react-native-seoul/kakao-login`은 autolink로 처리됩니다. 단, RN 0.84 + new arch는 종종 cache 문제가 있으니:

```bash
cd front/android && ./gradlew clean && cd ..
```

---

## I. 동작 테스트 (30분)

### I-1. 백엔드 로컬에서 검증

```bash
cd back
SUPABASE_URL=... SUPABASE_JWT_SECRET=... SUPABASE_SERVICE_ROLE_KEY=... \
DATABASE_URL=... DATABASE_SSL=true \
npm run dev
```

다른 터미널:
```bash
curl http://localhost:4000/api/v1/health
# {"ok":true,...}
```

### I-2. iOS 시뮬레이터

```bash
cd front
npx react-native run-ios
```

**테스트 시나리오**:
1. **Google 로그인** — 로그인 후 메인 화면 진입 확인
2. **Kakao 로그인** — KakaoTalk이 안 깔린 시뮬레이터에선 웹 fallback으로 자동 전환됨. 로그인 성공 확인.
3. **휴대전화 OTP**:
   - 본인 번호 입력 (예: `010-1234-5678`)
   - SMS 확인 → 6자리 입력 → 메인 진입
4. **Dumb 이메일**:
   - dumb에 등록된 이메일+비밀번호 입력
   - 같은 사용자로 로그인됨을 Supabase Studio에서 확인 (auth.users 동일 row)

### I-3. Android 에뮬레이터 / 실기기

- **Android 에뮬레이터에선 KakaoTalk이 없어** Kakao 로그인은 web 모드로만 동작 — 실기기 권장
- 실기기 테스트: `npx react-native run-android` 후 USB 연결 기기에서 실행

### I-4. SSO 검증 (가장 중요)

1. dumb 앱(또는 dumb 웹)에서 자신의 Google 계정으로 로그인
2. AURA 앱에서 같은 Google 계정으로 로그인
3. Supabase Studio → `auth.users` 테이블에서 **같은 row 1개**여야 함
4. `aura.user_profiles`에도 row 1개 자동 생성됨을 확인 (트리거)

---

## J. (지금 신청) Kakao 비즈앱 검수 — 결과까지 1~2주

⚠️ **이걸 통과해야 카카오 로그인이 의미 있어집니다** (이메일 없이는 dumb 사용자와 매칭 불가). C 단계 끝나는 즉시 신청해두세요. 출시 일정과 병렬로 진행됩니다.

1. Kakao Developers → **내 애플리케이션 → [앱 선택] → 비즈 앱 전환**
2. 필요 서류 (개인사업자 또는 법인):
   - 사업자등록증
   - 사업자명·대표자명·연락처
   - 법인은 추가로 법인 인감증명서
3. 검수 항목 선택:
   - **카카오계정(이메일)** ← dumb 사용자 매칭에 필수
   - **카카오계정(전화번호)** ← 휴대번호 자동 수령
4. **사용 사유 작성 팁** (검수 통과율을 높이려면):
   - 이메일: "기존에 가입된 사용자 계정과 통합 식별을 위해 이메일이 필요합니다"
   - 휴대전화: "사용자 본인 인증 및 알림 수신을 위해 사용합니다"
5. 검수 결과 (1~2주):
   - **승인**: 동의항목 활성화 → `.env`의 `KAKAO_LOGIN_ENABLED=true` → 다음 빌드부터 동작
   - **반려**: 사유 보고 보강 후 재신청 (보통 1차 반려 후 통과)

> 검수 통과 전에는 카카오 버튼을 누르면 "현재는 카카오 로그인을 준비 중입니다" 메시지가 떠서 사용자에게 다른 방법으로 안내됩니다. 그 동안 출시는 Google + Phone OTP + Dumb 이메일 3가지로 충분합니다.

---

## ☢️ 자주 마주칠 함정

| 증상 | 원인 / 해결 |
|---|---|
| `KAKAO_NO_ID_TOKEN` 에러 | C-3 OpenID Connect 활성화 누락 |
| Kakao 로그인은 되는데 Supabase가 거부 | C-5의 Client Secret이 Supabase에 안 들어감 또는 Redirect URI 누락 |
| Phone OTP가 영원히 안 옴 | D-2의 SMS provider 키 잘못 입력 또는 발신번호 미등록 |
| Google 로그인 후 401 | B의 Web Client ID가 Supabase에 등록되지 않음 (모바일 SDK는 web client로 idToken을 발급) |
| dumb 사용자가 AURA에서 다시 가입됨 | 같은 Supabase 프로젝트가 아닌 별 프로젝트를 가리키고 있음 — `SUPABASE_URL` 확인 |
| Android Kakao 안됨 | H-1의 키 해시가 production keystore와 다름. 새로 추출해서 Kakao 콘솔에 다시 등록 |
| iOS Kakao 안됨 | G-1의 URL scheme이 `kakao{key}` 형식이 아님. 또는 G-2의 AppDelegate handler 누락 |

---

## 끝나면 알려주세요

각 단계 완료 후 어떤 단계까지 끝났는지 알려주시면, 그 다음 단계의 코드/문서 변경이 필요하면 도와드리겠습니다. (예: dumb의 production OAuth client_id를 모르겠다 → 함께 찾아드림)
