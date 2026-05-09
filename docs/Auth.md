# Auth

기본은 Google. Supabase Auth가 발급한 JWT를 백엔드가 검증.

- **Google** (메인) — Gmail/Calendar 분석에 같은 토큰 사용해서 어차피 필요
- Kakao — `KAKAO_LOGIN_ENABLED=true` 일 때만 노출 (Kakao 비즈앱 검수 통과 후에 켜는 가드)
  - 현재 Kakao login을 통한 user phone number를 받아올 수 없음(app 출시해야 가능)
- 휴대전화 OTP — Supabase phone provider
- Dumb 계정(이메일/비번) — 같은 Supabase project를 dumb이랑 공유하는 SSO 백업
  - 현재 Dumb User Setting 없어서 미구현

## 로그인 버튼 미리보기

라이트 모드 기준. 공통: `height 54px · radius 14px · font 16/700 · icon 22×22 · gap 10`. 다크 모드는 `surface`/`surfaceMuted`/`textPrimary` 토큰만 다크 변형.

### Google

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 56" width="360" height="56" role="img" aria-label="Google 계정으로 시작">
  <rect x="0.5" y="0.5" width="359" height="55" rx="14" fill="#FFFFFF" stroke="#E2E3EC"/>
  <g transform="translate(84 17) scale(0.4583)">
    <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/>
    <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/>
    <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"/>
    <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"/>
  </g>
  <text x="116" y="35" fill="#0F1226" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="16" font-weight="700" letter-spacing="0.2">Google 계정으로 시작</text>
</svg>

### Kakao

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 56" width="360" height="56" role="img" aria-label="카카오로 시작">
  <rect x="0" y="0" width="360" height="56" rx="14" fill="#FEE500"/>
  <g transform="translate(112 17) scale(0.9167)">
    <path d="M12 3C6.48 3 2 6.48 2 10.8c0 2.91 1.96 5.45 4.84 6.84L5.5 21l4.36-2.86c.7.1 1.41.16 2.14.16 5.52 0 10-3.48 10-7.8S17.52 3 12 3z" fill="#191600"/>
  </g>
  <text x="144" y="35" fill="#191600" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="16" font-weight="700" letter-spacing="0.2">카카오로 시작</text>
</svg>

### 휴대전화

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 56" width="360" height="56" role="img" aria-label="휴대전화로 시작">
  <rect x="0" y="0" width="360" height="56" rx="14" fill="#6B5BFF"/>
  <g transform="translate(104 17) scale(0.9167)">
    <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" fill="#FFFFFF"/>
  </g>
  <text x="136" y="35" fill="#FFFFFF" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="16" font-weight="700" letter-spacing="0.2">휴대전화로 시작</text>
</svg>

### Dumb 계정

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 56" width="360" height="56" role="img" aria-label="Dumb 계정으로 로그인">
  <rect x="0.5" y="0.5" width="359" height="55" rx="14" fill="#F1F0F7" stroke="#E2E3EC"/>
  <rect x="88" y="17" width="22" height="22" rx="6" fill="#0F1226"/>
  <text x="99" y="33" fill="#FFFFFF" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="13" font-weight="800" text-anchor="middle">D</text>
  <text x="120" y="35" fill="#0F1226" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="16" font-weight="700" letter-spacing="0.2">Dumb 계정으로 로그인</text>
</svg>

### 색/그림자 토큰

| 버튼 | background | text | border | shadow tone |
|---|---|---|---|---|
| Google | `#FFFFFF` (`surface`) | `#0F1226` (`textPrimary`) | `#E2E3EC` (`lineStrong`) | `#1A1F38` (잉크) |
| Kakao | `#FEE500` (브랜드) | `#191600` (브랜드) | — | `#C7B400` (옐로 glow) |
| 휴대전화 | `#6B5BFF` (`accent`) | `#FFFFFF` (`accentText`) | — | `#6B5BFF` (보라 glow) |
| Dumb | `#F1F0F7` (`surfaceMuted`) | `#0F1226` (`textPrimary`) | `#E2E3EC` (`lineStrong`) | `#1A1F38` (잉크) |

> shadow는 background 톤에 동기화. press 시 `scale(0.97)` + 그림자 약화 (opacity 0.32→0.18, radius 16→10) — `front/src/features/app/screens/sign-in-screen.tsx:480-509`.

## settings

설정 위치

- Google Cloud Console (dumbteam2025@gmail.com) : [Link](https://console.cloud.google.com/welcome?project=aura-assistant-495302)

- Supabase Auth → Providers

- 휴대전화 인증: <https://console.solapi.com/dashboard> (dumbteam2025@gmail.com, 명의는 조민제)
