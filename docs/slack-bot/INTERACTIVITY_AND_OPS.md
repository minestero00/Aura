# Interactivity (slash command modal) + Ops 알림 설정 가이드

> 적용 대상 커밋: `e5f1400` 이후
> `/aura setting` 명령을 Slack 안에서 직접 modal로 편집하고,
> production 에러를 관리자 채널로 자동 알림하기 위한 사용자 측 설정.

---

## A. Slack Interactivity 활성화 — `/aura setting` modal

### 왜 필요한가
`/aura setting`이 이제 웹 링크 대신 **Slack `views.open`으로 modal**을 띄웁니다.
저장 버튼을 누르면 Slack이 `https://aura-dumbteam.vercel.app/api/slack/interactions`로
`view_submission` payload를 POST합니다. 이 URL이 Slack 앱에 등록돼 있지 않으면
modal 저장이 동작하지 않습니다.

### 절차

1. https://api.slack.com/apps → **AURA** 앱 선택
2. 좌측 사이드바 → **Interactivity & Shortcuts**
3. **Interactivity** 토글을 **On** 으로
4. **Request URL** 입력:

   ```
   https://aura-dumbteam.vercel.app/api/slack/interactions
   ```

   (커스텀 도메인을 쓰는 경우 그 도메인 + `/api/slack/interactions`)
5. 페이지 하단 **Save Changes** 클릭

### 검증

- Slack에서 `/aura setting` 실행 → "처리 중..." → modal이 떠야 함
- modal 안에서 시각만 09:00 → 10:30으로 바꾸고 **저장**
- modal이 닫혀야 정상
- `/aura setting`을 다시 실행하면 10:30이 그대로 들어있어야 함

### 트러블슈팅

| 증상 | 원인 | 해결 |
|---|---|---|
| modal이 안 뜸, ephemeral로 "trigger_id를 받지 못했습니다" | 명령 payload에 trigger_id 없음 | Slack 클라이언트에서 재시도 |
| modal이 안 뜸, "missing_scope" | manifest scope에 `commands` 누락 | OAuth & Permissions에서 `commands` 확인 |
| 저장 후 "dispatch_failed" 같은 Slack 에러 | Interactivity Request URL 미등록/오타 | A 절차의 4번 다시 확인 |
| 저장 후 modal에 "저장 실패. 잠시 후…" 에러 | DB 쓰기 실패 | Vercel 함수 로그(`/api/slack/interactions`) 확인 |

### modal에서 변경 가능한 항목 (현재)

- **다이제스트 시각** (timepicker)
- **타임존** (Asia/Seoul, Tokyo, Singapore, LA, NY, London, Berlin, UTC)
- **요일** (월~일, 최소 1개 필수)
- **요약 언어** (한국어 / English)
- **diff 포함** (체크박스 1개)
- **추가 지시** (multiline text, 1000자)

### modal에서 변경 **불가**한 항목 — 의도적 분리

- **레포 선택** — GitHub 레포 100+ 개 가능, Slack modal block 수 제한(50 blocks)에 부담
- **알림 채널** — `incoming-webhook` scope로 OAuth 시점에 영구 바인딩됨. 변경하려면 재설치
- **GitHub 연결** — 토큰/installation_id 관리는 web에서만 (보안)

→ 위 3가지는 안내 메시지("웹 설정 페이지에서 변경") + 링크를 modal context block에 표시.

---

## B. Ops 에러 알림 — `OPS_SLACK_WEBHOOK_URL`

### 왜 필요한가
`missing_scope`, OAuth token 실패, decrypt 실패, modal 저장 실패 등 **운영 회귀를 사용자가
보고하기 전에 인지**하기 위해, 핵심 에러 경로에서 `notifyOps()`가 admin 채널로 메시지를 보냅니다.

env 미설정 시 `notifyOps()`는 조용히 no-op이므로 코드는 항상 동작합니다.

### 절차

#### B-1. Admin Slack 채널에 Incoming Webhook 추가

1. 운영 알림을 받을 채널 결정 (예: 본인 워크스페이스의 `#aura-ops` private 채널)
2. https://api.slack.com/apps → **새 앱 또는 기존 별도 admin 앱** 선택
   - AURA 본 앱과 분리 권장 (token leak 시 영향 격리)
3. **Incoming Webhooks** → **Activate Incoming Webhooks: On**
4. **Add New Webhook to Workspace** → 위에서 정한 채널 선택 → 허용
5. 생성된 **Webhook URL** 복사 (`https://hooks.slack.com/services/T.../B.../...`)

#### B-2. Vercel 환경변수 등록

1. https://vercel.com/dumbteam/aura/settings/environment-variables
2. **Add New**:
   - Key: `OPS_SLACK_WEBHOOK_URL`
   - Value: 위 webhook URL 그대로
   - Environment: **Production** 체크 (Preview도 같이 받고 싶으면 같이 체크)
3. Save

#### B-3. 재배포

env 변경은 **다음 deployment부터 적용**됩니다. 즉시 적용하려면:
- `vercel --prod` 한 번 실행, 또는
- Vercel 대시보드 → Deployments → 최신 deploy → ⋮ → **Redeploy** (with **existing build cache** off 권장)

### 알림이 가는 케이스

| 코드 위치 | 알림 제목 | 의미 |
|---|---|---|
| `/api/slack-bot/slack-users` | `slack-users API failed` | users.list 호출 실패 (scope 누락 등) |
| `/api/slack-bot/slack-users` | `slack-users decrypt failed` | bot token 복호화 실패 (key 불일치) |
| `/api/slack/commands` (after catch) | `slash command handler failed` | slash command 백그라운드 처리 예외 |
| `/api/slack/commands` modal 경로 | `views.open failed` | modal 열기 실패 (token 만료, scope 누락) |
| `/api/slack/commands` modal 경로 | `bot token decrypt failed` | token 복호화 실패 |
| `/api/slack/interactions` | `settings save failed` | view_submission 후 DB 업데이트 실패 |
| `/api/slack/oauth` | `slack oauth token exchange failed` | OAuth code 교환 실패 |

### 알림 메시지 형식 예시

```
[AURA·production] slack-users API failed
{
  "slackErr": "missing_scope",
  "installationId": "c45e9ee3-..."
}
```

`VERCEL_ENV`(`production`/`preview`/`development`)가 메시지 prefix로 자동 들어가서
preview 환경 에러까지 같은 채널에서 보고 싶지 않다면 Vercel env 등록 시 Production만 체크.

### 보안 고려

- webhook URL은 **public token이 아니지만 leak되면 누구나 admin 채널에 메시지 발송 가능**.
  Vercel env 외 위치에 두지 말 것 (`.env`/git에 절대 X).
- `notifyOps` payload는 **민감 정보(token 자체, 사용자 메일 등)를 넣지 말 것**.
  현재 코드는 team_id, installation_id, slack 에러 코드만 보냄 — OK.
- 알림 폭주 시 운영자 자체가 마비될 수 있음. 같은 에러가 분당 100건 이상이면
  client 측에서 추가 rate-limit 또는 webhook 측 throttle 고려 (현재는 안 잡혀있음).

### 트러블슈팅

| 증상 | 원인 | 해결 |
|---|---|---|
| 에러가 발생했는데 알림이 안 옴 | env 미적용 (재배포 안 함) | B-3 재배포 |
| 알림이 와야 하는데 안 옴 | webhook URL 오타/만료 | B-1 다시 발급 + B-2 갱신 |
| Vercel 함수 로그에 `[ops] notify failed` | webhook 측 4xx/5xx | webhook 토큰 만료 또는 채널 archive |
| preview 환경에서도 알림 옴 | env가 Preview에도 적용됨 | Vercel env 설정에서 Preview 체크 해제 |

---

## C. 검증 체크리스트

설정 끝낸 후 한 번에 확인:

- [ ] `/aura setting` → modal 표시
- [ ] modal에서 시각 변경 후 저장 → modal 닫힘
- [ ] `/aura setting` 재실행 → 변경값 유지
- [ ] (선택) 잘못된 데이터로 저장 시도 (요일 0개) → modal에 에러 표시
- [ ] (선택) `OPS_SLACK_WEBHOOK_URL` 설정 후 일부러 실패 유도 → admin 채널에 알림

---

## D. 관련 파일

| 파일 | 역할 |
|---|---|
| `web/src/app/api/slack/commands/route.ts` | `/aura ...` slash command 라우터 |
| `web/src/app/api/slack/interactions/route.ts` | view_submission 핸들러 (신설) |
| `web/src/lib/slack-bot/modal.ts` | 설정 modal block builder |
| `web/src/lib/slack-bot/ops.ts` | `notifyOps()` 헬퍼 |
| `web/src/lib/slack-bot/crypto.ts` | bot token AES-GCM decrypt |

---

## E. 다음 단계 후보

modal에서 다룰 수 있는 영역을 더 넓히고 싶다면:

1. **레포 일괄 토글** — 현재 등록된 레포만 modal에서 enable/disable (전체 추가는 web)
2. **manual_trigger** — modal 하단에 "지금 한 번 보내기" 버튼 (action handler 필요)
3. **Channel re-bind** — workspace에 봇이 들어가 있는 channel 목록을 `conversations.list`로 받아 select (channels:read scope 추가 필요)
4. **알림 일시정지** — `is_active=false` 토글 (modal에서 한 번에 끌 수 있도록)
