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

![Google 계정으로 시작](./auth-buttons/google.svg)

### Kakao

![카카오로 시작](./auth-buttons/kakao.svg)

### 휴대전화

![휴대전화로 시작](./auth-buttons/phone.svg)

### Dumb 계정

![Dumb 계정으로 로그인](./auth-buttons/dumb.svg)

### 색/그림자 토큰

| 버튼     | background                 | text                      | border                   | shadow tone           |
| -------- | -------------------------- | ------------------------- | ------------------------ | --------------------- |
| Google   | `#FFFFFF` (`surface`)      | `#0F1226` (`textPrimary`) | `#E2E3EC` (`lineStrong`) | `#1A1F38` (잉크)      |
| Kakao    | `#FEE500` (브랜드)         | `#191600` (브랜드)        | —                        | `#C7B400` (옐로 glow) |
| 휴대전화 | `#6B5BFF` (`accent`)       | `#FFFFFF` (`accentText`)  | —                        | `#6B5BFF` (보라 glow) |
| Dumb     | `#F1F0F7` (`surfaceMuted`) | `#0F1226` (`textPrimary`) | `#E2E3EC` (`lineStrong`) | `#1A1F38` (잉크)      |

> shadow는 background 톤에 동기화. press 시 `scale(0.97)` + 그림자 약화 (opacity 0.32→0.18, radius 16→10) — `front/src/features/app/screens/sign-in-screen.tsx:480-509`.

## settings

설정 위치

- Google Cloud Console (dumbteam2025@gmail.com) : [Link](https://console.cloud.google.com/welcome?project=aura-assistant-495302)

- Supabase Auth → Providers

- 휴대전화 인증: <https://console.solapi.com/dashboard> (dumbteam2025@gmail.com, 명의는 조민제)
