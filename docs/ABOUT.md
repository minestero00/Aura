# AURA — 프로젝트 소개

> **A**i, for **U**ser **R**eliable **A**ssistant
> "사용자 행동을 최소화하고, 백엔드가 모든 것을 미리 처리해주는 친절한 AI 비서"

---

## 한 줄 요약

AURA는 **캘린더 · 메일 · 뉴스 · 날씨 · 이동 정보**를 하나의 AI 브리핑으로 묶어주는 개인 비서 앱입니다.
모바일 앱(iOS/Android)과 웹, 그리고 Slack 봇까지 — **개인 사용자와 작은 회사** 양쪽 모두를 타겟으로 합니다.

---

## 왜 만들었는가?

평소에 우리는 다음과 같은 사소한 마찰을 매일 반복합니다:

- 오늘 일정이 몇 시인지 확인하려고 캘린더 앱에 들어가야 함
- 그 장소까지 가는 대중교통을 따로 검색해야 함
- 뉴스는 봐야 하는데 들어가서 골라 읽기가 귀찮음
- 메일함을 열어 중요한 메일을 직접 찾아야 함

AURA의 철학은 단순합니다 — **"user 입장에서 최소한의 action, 최대한의 제공"**.
이 모든 정보를 **백엔드가 미리 모아 하나의 일일 브리핑**으로 만들어 사용자에게 던져줍니다.

---

## 주요 기능

### 개인용 (Personal)

| 기능                  | 설명                                                                                         |
| --------------------- | -------------------------------------------------------------------------------------------- |
| **Daily Briefing**    | 오늘의 일정 + 날씨 + 메일 다이제스트 + 뉴스 요약을 하나의 카드로 (30분 캐시, 워커 사전 계산) |
| **Smart Calendar**    | 일정 + 출발지→목적지 이동시간 자동 계산                                                      |
| **Mail → Event**      | 메일에서 일정을 자동 추출해 캘린더에 제안                                                    |
| **Bus Arrival Alert** | iOS Region Monitoring / Android Geofencing 기반 client-driven 도착 알림                      |
| **Wellness Tip**      | Health Connect 연동, 사용자 열람 패턴 학습 후 하루 1회 제시                                  |
| **Aura Chat**         | 모은 컨텍스트를 바탕으로 자연어 질문 응답                                                    |

### 비즈니스용 (Business Mode)

| 기능              | 설명                                                              |
| ----------------- | ----------------------------------------------------------------- |
| **회의 자동화**   | 회의 사전 브리핑 → 실시간 STT → AI 회의록 → Slack/링크 공유       |
| **Slack App**     | GitHub Digest + `/aura` 슬래시 커맨드 (아래 별도 섹션)            |

---

## AURA Slack App

> **"팀이 매일 아침 GitHub 보러 가지 않아도 되게."**

AURA Slack App은 **GitHub Organization의 매일 변경 내용을 AI가 요약해 Slack으로 전송**하는 서비스입니다.
모바일 앱과 별개로 동작하며, `web/` 프로젝트에 통합되어 Vercel + Railway 조합으로 배포됩니다.

### 설치 플로우 (End-to-end)

```
1. https://dumb.io.kr/aura/slack 접속 → "Add to Slack" 클릭
2. GitHub App 설치 → Organization · Repo 선택
3. Slack OAuth → 채널 선택 → 토큰 AES-256-GCM 암호화 저장
4. /aura/slack/settings 에서 GitHub ↔ Slack 유저 매핑 (@멘션 정확도↑)
5. 매일 설정 시각 → Railway worker(30분 루프)가 due 체크 → digest 전송
```

### 슬래시 커맨드

| 명령 | 동작 |
| --- | --- |
| `/aura brief`   | 즉시 요약 요청 (DB에 `manual_trigger=true` 플래그, 워커가 처리) |
| `/aura setting` | 설정 페이지 딥링크 |
| `/aura repos`   | 현재 구독 중인 repo 목록 |
| `/aura help`    | 도움말 |

> 모든 요청은 Slack Signing Secret으로 서명 검증 후 처리됩니다.

### 메시지 포맷

- **Slack Block Kit** 기반 리치 메시지
- 커밋/PR을 카테고리별로 분류
- GitHub login → Slack user ID 매핑 적용해 작성자 `@멘션` 자동 변환
- Claude로 팀 맞춤 톤의 요약 생성

### 기술 스택 (Slack App)

| 영역 | 선택 |
| --- | --- |
| 웹/라우트 | Next.js 16 App Router (`web/src/app/api/slack/*`, `/api/github/*`) |
| Slack SDK | `@slack/bolt` |
| GitHub SDK | `@octokit/rest` + GitHub App private key (JWT) |
| Cron | Railway worker 30분 폴링 (manual trigger 즉시 반응) |
| DB | Supabase — `bot_installations`, `user_mappings`, 토큰 암호화 컬럼 |
| 암호화 | `BOT_ENCRYPTION_KEY` (back의 `APP_ENCRYPTION_KEY`와 동일 값) |

### 외부 등록 URL

- GitHub App callback — `https://<domain>/aura/api/github/callback`
- Slack OAuth redirect — `https://<domain>/aura/api/slack/oauth`
- Slack slash command request URL — `https://<domain>/aura/api/slack/commands`

자세한 내용은 [`docs/slack-bot/`](slack-bot/) — `architecture.md`, `db.md`, `github.md`, `slack.md`, `ai.md`, `cron.md`, `ui.md`, `deploy.md` 참고.

---

## 시스템 구조

```
┌──────────────────────────┬────────────────────────┐
│ Mobile (front/)          │ Web (web/)             │
│ React Native 0.84        │ Next.js (App Router)   │
│ iOS · Android            │ dumb.io.kr/aura        │
└─────────────┬────────────┴──────────┬─────────────┘
              │                       │
              └──────── HTTPS ────────┘
                          │
              ┌───────────▼────────────┐
              │ Backend (back/)        │
              │ Express + TypeScript   │
              │ ─ API 서버 (4000)       │
              │ ─ Worker  (브리핑 사전계산)│
              └───────────┬────────────┘
                          │
        ┌─────────────────┼──────────────────┐
        ▼                 ▼                  ▼
    Supabase          Anthropic          외부 API
    (Postgres)        (Claude)           Google · OpenWeather
                                         GTFS · Gmail · Calendar
```

### 배포(25/05/17)

- **Backend**: Railway (`aura api` + `aura worker`)
- **Web**: Vercel
- **DB**: Supabase (Postgres, `aura` schema 단독 소유)
- **Mobile**:
  - Android — GitHub Releases (APK)
  - iOS — TestFlight

---

## 핵심 설계 원칙

### 1. Backend-first

모든 무거운 작업(LLM 호출, 외부 API aggregation, 캐싱)은 backend가 담당합니다.
모바일/웹은 **이미 가공된 브리핑 스냅샷**만 받아 렌더링합니다.

### 2. 보안 우선

- AES-256-GCM으로 외부 서비스 토큰 암호화 (production은 `APP_ENCRYPTION_KEY` 미설정 시 시작 거부)
- Helmet + CORS allowlist + IP rate limit 60/min
- 모든 라우트 zod schema 입력 검증
- Google OAuth → 자체 access/refresh 토큰 발급

### 3. 비용 가드

LLM은 비싸기 때문에 모든 Anthropic 호출 직전 `usageService.consumeOrThrow()`를 통과해야 합니다.

- **분 단위 호출수 제한**
- **일일 호출수 제한**
- **일일 토큰 예산** (`USAGE_DAILY_TOKEN_BUDGET`)
- 호출 결과의 `usage`를 받아 `recordModelUsage()`로 기록 → 추적 끊김 방지

### 4. 디자인 토큰 일원화

- Source of truth: `aura-app-design-system/assets/tokens.css`
- 네이티브 미러: `front/src/features/app/styles/theme.ts`
- 기본 색: `AURORA #6B5BFF`
- 모션: `auraMotion` 토큰 — "딱딱하게 느껴지지 않게"
- **하드코딩 hex 금지**, `theme.colors.*`만 사용

---

## 기술 스택

**Mobile / Web**

![React Native](https://img.shields.io/badge/React_Native-20232A?style=flat&logo=react&logoColor=61DAFB)
![Next.js](https://img.shields.io/badge/Next.js-000000?style=flat&logo=nextdotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=white)

**Backend / Data**

![Express](https://img.shields.io/badge/Express.js-000000?style=flat&logo=express&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3FCF8E?style=flat&logo=supabase&logoColor=white)
![Postgres](https://img.shields.io/badge/PostgreSQL-4169E1?style=flat&logo=postgresql&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-DC382D?style=flat&logo=redis&logoColor=white)

**AI / Auth / Integrations**

![Anthropic](https://img.shields.io/badge/Anthropic_API-191919?style=flat&logo=anthropic&logoColor=white)
![Firebase](https://img.shields.io/badge/firebase-ffca28?style=flat&logo=firebase&logoColor=white)
![Google](https://img.shields.io/badge/Google_OAuth-4285F4?style=flat&logo=google&logoColor=white)
![Github](https://img.shields.io/badge/Github_App-0B0D0E?style=flat&logo=github&logoColor=white)
![Slack](https://img.shields.io/badge/Slack_Bot-4A154B?style=flat&logo=slack&logoColor=white)

**Deploy**

![Railway](https://img.shields.io/badge/Railway-0B0D0E?style=flat&logo=railway&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-000000?style=flat&logo=vercel&logoColor=white)
![TestFlight](https://img.shields.io/badge/TestFlight-0D96F6?style=flat&logo=apple&logoColor=white)
![Android](https://img.shields.io/badge/Android-3DDC84?style=flat&logo=android&logoColor=white)

---

## 디렉터리 가이드

```
aura/
├── front/                    React Native 앱 (iOS/Android)
├── back/                     Express API + Worker
├── web/                      Next.js 웹 (dumb.io.kr/aura, /business, /slack)
├── aura-app-design-system/   디자인 토큰 source of truth
├── deploy/                   배포 스크립트/설정
├── supabase/                 DB 마이그레이션
├── docs/                     문서 (Auth, Business, Slack bot, versions)
└── Image/                    앱 아이콘 · 에셋
```

각 모듈 폴더(`front/`, `back/`, `web/`)에는 자체 `CLAUDE.md` + `workflow.md`가 있어
모듈 단위 규칙·금지사항·파일 구조가 분리 관리됩니다.

---

## 타겟 사용자

1. **일반 사용자** — 매일 캘린더/메일/뉴스 확인이 귀찮은 모든 사람
2. **작은 회사** — 회의 자동화 + Slack 통합으로 도움을 받을 수 있는 팀

언어: 한국어 / English (이중언어 권한 문자열 강제)

---

## 더 읽어보기

- [Auth.md](Auth.md) — 인증 흐름
- [business-mode.md](business-mode.md) — 비즈니스 모드 상세
- [subscription-billing.md](subscription-billing.md) — 구독·과금 설계
- [slack-bot/](slack-bot/) — Slack 봇 명세
- [versions/](versions/) — 버전별 변경 이력
- [../OPTIMIZATION.md](../OPTIMIZATION.md) — 최적화 우선순위 매트릭스
- [../todo.md](../todo.md) — 향후 workflow 명세
