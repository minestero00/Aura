# AURA Slack Bot

> GitHub Organization의 매일 변경 내용을 AI가 요약해 Slack으로 전송하는 서비스.  
> AURA 앱과 별개로 시작하며, `web/` 프로젝트 내에 통합.

---

## 한 줄 설명

"팀이 매일 아침 GitHub 보러 가지 않아도 되게."

---

## 핵심 플로우

```
1. 웹에서 GitHub 로그인 → Organization 선택 → Repo 선택
2. Slack "Add to Slack" 버튼 → 채널 선택
3. 매일 설정 시간 → Vercel Cron 트리거
4. GitHub API → 전날 commits/PRs 수집
5. Claude → 팀 맞춤 요약 생성
6. Slack → 채널에 메시지 전송

+ /aura brief  → 즉시 요약 요청
+ /aura setting → 설정 페이지 딥링크
```

---

## 문서 구조

| 파일 | 내용 |
|------|------|
| `idea.md` | 초기 아이디어 원문 |
| `architecture.md` | 시스템 전체 구조 + 데이터 흐름 |
| `db.md` | Supabase 스키마 + RLS |
| `github.md` | GitHub OAuth + API 사용, Rate Limit 전략 |
| `slack.md` | Slack App 설정, Slash Commands, OAuth |
| `ai.md` | Claude 요약 로직, 프롬프트, 토큰 관리 |
| `cron.md` | Vercel Cron 전략, timezone 처리 |
| `ui.md` | 웹 UI/UX 플로우 (web/slack 라우트) |
| `deploy.md` | 환경변수 전체 목록, 배포 체크리스트 |

---

## 빌드 순서

### Phase 1 — 우리 팀 내부용 (MVP)
1. Supabase 테이블 생성 (`db.md`)
2. GitHub OAuth App 생성 + 연동 (`github.md`)
3. Slack App 생성 + Slash Command 등록 (`slack.md`)
4. GitHub API → Claude 요약 → Slack 전송 코어 로직 (`ai.md`)
5. Vercel Cron 연결 (`cron.md`)
6. 웹 UI — 설정 페이지만 (`ui.md`)

### Phase 2 — 외부 공개
- Slack App Directory 제출 (심사 2-4주)
- 팀별 채널 필터링 (채널마다 다른 repo 구독)
- 주간 요약 추가
- AURA 앱 연동 (모바일에서 요약 확인)

---

## 기술 스택

| 영역 | 선택 | 이유 |
|------|------|------|
| 웹 | Next.js 16 (`web/`) | 이미 있음 |
| DB | Supabase | 이미 있음 |
| Slack | `@slack/bolt` | 공식 SDK, Next.js API Route 호환 |
| GitHub | Octokit `@octokit/rest` | 공식 SDK |
| AI | Anthropic SDK | 이미 사용 중 |
| 스케줄 | Vercel Cron | `web/`가 Vercel 배포 |
| 암호화 | Node.js `crypto` AES-256-GCM | token 저장 시 암호화 |

---

## 안 만드는 것 (MVP 범위 밖)

- 화자별 분리 요약
- Jira / Linear 연동
- GitHub Actions 결과 알림
- 팀원별 기여도 랭킹 (개인 정보 이슈)
- 자체 commit message 보강 CLI (나중에)
