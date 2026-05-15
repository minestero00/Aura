# 시스템 아키텍처

---

## 전체 구조

```
┌─────────────────────────────────────────────────────────────┐
│                    사용자 (팀장)                              │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              web/ (Next.js on Vercel)                        │
│                                                              │
│  /slack           ← 랜딩, 소개, "Add to Slack" 버튼         │
│  /slack/setup     ← GitHub OAuth → repo 선택 → Slack 연동   │
│  /slack/settings  ← /aura setting 명령어가 딥링크            │
│                                                              │
│  /api/github/callback   ← GitHub OAuth 처리                 │
│  /api/slack/oauth       ← Slack OAuth 처리                  │
│  /api/slack/events      ← Slack 이벤트 수신 (멘션 등)       │
│  /api/slack/commands    ← /aura brief, /aura setting        │
│  /api/cron/digest       ← Vercel Cron 트리거 (매 정시)      │
└──────────┬────────────────────────┬───────────────────────--┘
           │                        │
           ▼                        ▼
┌──────────────────┐    ┌──────────────────────────────────┐
│   Supabase DB    │    │         외부 서비스               │
│                  │    │                                   │
│ slack_installs   │    │  GitHub API (REST)                │
│ digest_logs      │    │  ├─ commits                       │
│                  │    │  ├─ pull_requests                 │
│                  │    │  └─ releases                      │
│                  │    │                                   │
│                  │    │  Anthropic API (Claude)           │
│                  │    │  └─ 요약 생성                     │
│                  │    │                                   │
│                  │    │  Slack API (Bot Token)            │
│                  │    │  └─ 메시지 전송                   │
└──────────────────┘    └──────────────────────────────────┘
```

---

## 데이터 플로우 — 일일 Digest

```
Vercel Cron (매 정시 0분)
  │
  ▼
/api/cron/digest
  │
  ├─ Supabase: 현재 시각 기준 digest_time 해당하는 installations 조회
  │
  └─ 각 installation에 대해 (순차 또는 병렬):
       │
       ├─ GitHub API: 선택된 repos의 어제 commits/PRs 조회
       │    └─ commit message 빈약 시: diff 추가 조회
       │
       ├─ Anthropic: 팀 요약 프롬프트 → 구조화된 요약 생성
       │
       ├─ Slack API: 채널에 Block Kit 메시지 전송
       │
       └─ Supabase: digest_logs에 결과 기록
```

---

## 데이터 플로우 — Slash Command

```
팀원: /aura brief  (Slack에서)
  │
  ▼
Slack API → POST /api/slack/commands
  │
  ├─ 3초 이내 응답 필수 (Slack 요구사항)
  │    └─ 즉시 "요약 생성 중..." 메시지 응답
  │
  └─ 백그라운드 처리:
       ├─ GitHub API → 데이터 수집
       ├─ Anthropic → 요약
       └─ Slack API: response_url로 결과 전송
```

---

## web/ 내 코드 위치

```
web/src/
  app/
    slack/
      page.tsx                ← 랜딩 (설치 안내)
      setup/
        page.tsx              ← 설정 마법사 (3-step)
      settings/
        page.tsx              ← 설정 관리 UI
    api/
      github/
        callback/
          route.ts            ← GitHub OAuth callback
      slack/
        oauth/
          route.ts            ← Slack OAuth callback
        commands/
          route.ts            ← Slash command 처리
        events/
          route.ts            ← Slack event 수신 (필요 시)
      cron/
        digest/
          route.ts            ← Cron 트리거
  lib/
    slack-bot/
      github.ts               ← GitHub API 클라이언트
      summarizer.ts           ← Claude 요약 로직
      slack-client.ts         ← Slack 메시지 전송
      crypto.ts               ← token 암호화/복호화
      digest.ts               ← 전체 digest 오케스트레이션
```

---

## 보안 경계

```
공개 (인증 불필요):
  /slack              ← 랜딩 페이지
  /api/slack/events   ← Slack이 서명 검증으로 보호

인증 필요:
  /slack/setup        ← GitHub OAuth 세션 필요
  /slack/settings     ← GitHub OAuth 세션 필요
  /api/cron/digest    ← Vercel Cron Secret 헤더로 보호
```

---

## GitHub OAuth vs GitHub App

MVP는 **GitHub OAuth App** 사용.  
이유: 설정이 단순, 개인 토큰으로 org 접근 가능.

나중에 고려: **GitHub App**
- 장점: 세밀한 권한, 더 높은 rate limit (5000 → 무제한 일부)
- 단점: 설치 플로우 복잡, App 등록 필요
- 전환 시점: 사용자 50팀 이상 or rate limit 문제 발생 시
