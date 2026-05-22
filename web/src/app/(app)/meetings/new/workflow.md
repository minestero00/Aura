# `meetings/new/` workflow

회의 생성 wizard 데이터·UI flow.

## 1. 진입

진입 경로:
- 사이드바 "새 회의" / 목록 페이지 "새 회의록"
- 대시보드 "오늘 회의" 옆 노트 버튼 → `?eventId=EVENT_ID` 부착
- 빈 목록의 "첫 회의 시작하기"

middleware → session 검증, `(app)/layout.tsx` 렌더링 후 페이지 컴포넌트 mount.

## 2. State 다이어그램

```
            ┌──────────────────┐
            │  step = "setup"  │
            │  - title 입력     │
            │  - templateId    │
            │  - body prefill  │
            └────────┬─────────┘
                     │ "회의 시작 →" 클릭
                     ▼
            ┌──────────────────┐
            │ step = "recording"│
            │ - timer 시작     │
            │ - recording=true │
            │ - body 편집 가능 │
            │ - transcript [] (Phase 2 실시간 추가)│
            └────────┬─────────┘
                     │ "종료 + AI 요약" 클릭
                     ▼
            ┌──────────────────┐
            │  POST /business/ │
            │  meetings        │
            └────────┬─────────┘
                     │ 201 응답
                     ▼
            router.push(`/meetings/${id}?summarize=1`)
```

새로고침/뒤로가기 시 state 휘발 → setup으로 복귀. (Phase 2: localStorage 복원)

## 3. Step 1 — Setup

### 3.1 useEffect: eventId prefill

```ts
useEffect(() => {
  if (!eventId) return;
  api.get<{ title: string }>(`/calendar/events/${eventId}`)
    .then(ev => { if (ev.title) setTitle(ev.title); })
    .catch(() => undefined);
}, [eventId]);
```

- 성공: 제목 자동 입력
- 실패 (404/403/500/네트워크): silent — 사용자가 직접 입력

### 3.2 템플릿 선택

- 라디오 형태, 5종: general / standup / one_on_one / customer / project
- 선택 시 `body`가 해당 템플릿 markdown으로 **덮어쓰임** — 이미 입력한 노트 사라짐 (의도된 동작, setup 단계라 데이터 없음)

### 3.3 "회의 시작 →" 버튼

- `disabled={!title.trim()}` — 빈 제목 차단
- 누르면 `step = "recording"`, `recording = true`, 타이머 시작

## 4. Step 2 — Recording

### 4.1 타이머

```ts
useEffect(() => {
  if (recording) {
    startRef.current = Date.now() - elapsed * 1000;
    timerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
    }, 1000);
  } else {
    if (timerRef.current) clearInterval(timerRef.current);
  }
  return () => { if (timerRef.current) clearInterval(timerRef.current); };
}, [recording]);
```

- pause/resume 시 `elapsed` 보존 (`startRef.current = Date.now() - elapsed * 1000`)
- 컴포넌트 unmount 시 timer 정리 (return cleanup)

### 4.2 녹음 토글

- "녹음 중" 버튼 클릭 → `recording = false` (pause)
- "▶ 재개" 버튼 클릭 → `recording = true`
- (Phase 2) recording state는 MediaRecorder start/pause와 sync

### 4.3 좌측 패널 — 노트 편집

- textarea, markdown source 직접 입력
- 글꼴: mono
- 자동 저장 X (Phase 2)

### 4.4 우측 패널 — 자막 (현재 placeholder)

- "Whisper STT — 구현 예정" 배지
- transcript 배열이 비어있으면 안내 (마이크 아이콘 + 텍스트)
- recording=true & transcript=[]: "음성을 감지하는 중…"
- recording=false: "녹음을 시작하면 자막이 표시됩니다"

### 4.5 Focus mode

- "집중 모드" 클릭 → 우측 자막 패널 숨김, 좌측 노트 전체 화면
- "집중 해제"로 복귀

### 4.6 "종료 + AI 요약" — 저장

```ts
const handleFinish = async () => {
  setSaving(true);
  try {
    const note = await api.post<{ id: string }>("/business/meetings", {
      title,
      body,
      rawTranscript: transcript.join("\n"),
      templateId,
      eventId: eventId ?? undefined
    });
    router.push(`/meetings/${note.id}?summarize=1`);
  } catch (e) {
    console.error(e);
    setSaving(false);
  }
};
```

- saving 중에는 버튼 disabled + spinner
- 성공 시 detail로 이동 (`?summarize=1` query)
- 실패 시 saving=false만 — **노트 손실 위험 (Phase 2 backup 필수)**

## 5. Edge case 자세히

### 5.1 마이크 권한 거부 (Phase 2)
- 현재: STT 미구현이라 무관.
- Phase 2: `navigator.mediaDevices.getUserMedia({audio: true})` reject → toast "마이크 권한 거부됨. 노트 입력만 가능합니다." + STT 토글 disable.

### 5.2 브라우저 백그라운드/탭 닫힘
- 현재: state 휘발. 작성 중이던 노트 손실.
- Phase 2: `beforeunload` 경고 + localStorage에 매 30초 백업 + 다음 진입 시 "이전 작업 복구하시겠어요?" 모달.

### 5.3 Whisper API 503 / 시간초과 (Phase 2)
- 청크 업로드 실패 → 우측 패널에 "STT 일시 중단됨 [재시도]" 표시.
- 노트 입력은 계속 가능.

### 5.4 일일 voice usage 초과 (Phase 2)
- 429 응답 → 우측 패널 "오늘 자막 한도 도달" + 노트 입력만 가능.

### 5.5 25MB 청크 초과 (Phase 2)
- 청크 단위가 작아 (5-10s) 도달 X. 안전을 위해 10s마다 flush.

### 5.6 네트워크 끊김 (저장 시)
- catch → console.error → saving=false. 사용자는 그대로 noted 화면 stuck.
- Phase 2: retry 모달 ("저장 실패. 다시 시도하시겠어요?") + localStorage backup.

### 5.7 Business 구독 만료 (저장 시점)
- `POST /business/meetings` 403 → catch swallowed.
- Phase 2: error code 검사해서 `BUSINESS_REQUIRED`면 "구독이 필요합니다 [구독 페이지]" 모달.

### 5.8 잘못된 templateId
- 백엔드는 max 50자만 검증, 알 수 없는 id도 허용. frontend도 폴백 (`TEMPLATE_BODY[id] ?? ""`).

### 5.9 매우 긴 회의 (4시간+, transcript 100KB+)
- 백엔드 `rawTranscript` zod max 100_000. 초과 시 400.
- Phase 2: frontend가 50_000자 도달 시 가장 오래된 transcript line부터 prune + 사용자에게 안내.

### 5.10 body 50KB 초과
- 백엔드 zod max 50_000. 초과 시 400.
- Phase 2: textarea char counter + 한도 도달 시 readonly.

### 5.11 동시 두 탭에서 새 회의 작성
- 각자 별도 ID로 저장 — 충돌 없음. 두 노트 모두 목록에 표시.

### 5.12 저장 직후 detail로 이동했는데 detail이 404
- 백엔드 DB write 후 read 시점 사이에 race? Postgres single-row insert이므로 사실상 X. 발생 시 detail의 SWR이 재시도.

## 6. 변경 시 영향 범위

- `TEMPLATE_BODY` 5종 — 백엔드는 templateId만 저장. body 자체는 frontend 제어. 새 템플릿 추가는 frontend만 수정.
- transcript join 방식 (`\n`) — Phase 2에서 timestamp 포함 시 JSON 또는 다른 구분자로 변경 필요.
- `?summarize=1` query — detail 페이지에서 read. 변경 시 detail도 같이.
