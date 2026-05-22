# `meetings/[id]/` workflow

상세 페이지 데이터·UI flow.

## 1. 진입

진입 경로:
- 목록 페이지 카드 클릭
- 저장 직후 `/meetings/new` 에서 redirect (`?summarize=1` query 포함)
- 대시보드 "Recent notes" 카드

middleware → 세션 검증 → 페이지 mount → SWR fetch.

## 2. 데이터 fetch

```ts
const { data: note, mutate } = useSWR<MeetingNote>(
  `/business/meetings/${id}`,
  (p: string) => api.get<MeetingNote>(p),
  { onSuccess: n => { if (!editing) setBody(n.body); } }
);
```

- 첫 fetch 성공: `body` state 초기화
- focus revalidate (탭 전환 후 복귀) 시 재호출 — 단, `editing` 중이면 `body` 덮어쓰기 X (사용자 입력 보호)

### 2.1 SWR 응답 분기

| 응답 | UI |
|---|---|
| 로딩 (note=null) | 전체 spinner |
| 200 success | 정상 페이지 렌더 |
| 404 | (현재) spinner 무한 — Phase 2: 404 페이지 또는 "노트를 찾을 수 없습니다" |
| 401 | (현재) silent — Phase 2: `/login?next=...` redirect |

## 3. 상단바 구성

```
[ ← back ] [ 제목 ] [ 작성 시간 ]  ......  [ 수정 ] [ 공유 ] [ 내보내기 ▾ ]
```

편집 모드 진입 시 우측 액션 영역이 `[취소] [저장]`로 교체.

## 4. 액션별 flow

### 4.1 수정 → 편집 모드

1. "수정" 클릭 → `editing = true`
2. `<pre>` 가 textarea로 교체, `body` state가 입력값
3. SWR auto revalidate 시 `onSuccess` 가드로 `body` 보존 (덮어쓰기 X)

### 4.2 취소

1. "취소" → `editing = false`, `body = note.body` 복원
2. 텍스트 변경 사항 폐기

### 4.3 저장

```ts
const handleSave = async () => {
  setSaving(true);
  try {
    await api.patch(`/business/meetings/${id}`, { body });
    await mutate();
    setEditing(false);
  } finally {
    setSaving(false);
  }
};
```

- saving 중 버튼 disabled + "저장 중…"
- 성공: `mutate()`로 최신 상태 재fetch, 편집 모드 종료
- 실패: catch 없음 → console만 → 사용자에게 알 수 없음. **Phase 2: error toast + retry**

### 4.4 공유

```ts
const handleShare = async () => {
  setSharing(true);
  try {
    const result = await api.post<{ shareToken: string }>(`/business/meetings/${id}/share`);
    await mutate();
    const url = `${window.location.origin}/share/${result.shareToken}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  } finally {
    setSharing(false);
  }
};
```

- `POST :id/share` idempotent — 이미 있으면 같은 token 반환
- 클립보드 권한 거부 시 `writeText` reject → 현재 catch 없어서 silent. Phase 2: fallback `prompt()`.
- `copied` true 2.5초간 버튼 텍스트 "링크 복사됨" + 체크 아이콘

### 4.5 내보내기

```ts
const handleExport = (fmt: "md" | "docx") => {
  window.open(`${process.env.NEXT_PUBLIC_API_URL}/business/meetings/${id}/export?format=${fmt}`, "_blank");
};
```

- 새 탭 열어 다운로드
- md: 정상 200 → 브라우저가 파일 저장 다이얼로그
- docx: 현재 501 → 새 탭에 JSON `{error:docx_not_implemented}` 노출. Phase 2: 토스트 안내 + 본 페이지 유지.

### 4.6 원본 자막 보기

```html
<details>
  <summary>원본 자막 보기</summary>
  <pre>{note.rawTranscript}</pre>
</details>
```

- `rawTranscript`가 null이면 `<details>` 자체 미렌더링
- 접힌 상태가 기본

## 5. Edge case 자세히

### 5.1 잘못된 ID 또는 다른 사용자 노트
- 백엔드 404 → SWR error 상태 → `if (!note)` spinner 무한.
- **Phase 2**: error에 따라 "노트를 찾을 수 없습니다" UI + 목록으로 돌아가기 버튼.

### 5.2 편집 중 다른 디바이스에서 같은 노트 수정 (concurrent)
- 현재: last-write-wins. SWR auto revalidate가 다른 디바이스 변경을 가져오지만 `editing` 가드로 덮어쓰기 X. 저장 시 내 버전이 이김.
- **Phase 2**: PATCH 시 `If-Match: <updated_at>` 헤더 → 백엔드가 비교 → 다르면 412 → 모달 "다른 곳에서 수정됨 [내 버전 유지 | 다른 버전 가져오기]"

### 5.3 편집 중 30분+ idle → 세션 만료
- "저장" 시 401 → 현재 silent. **Phase 2**: error code 보고 `/login?next=/meetings/{id}` redirect.

### 5.4 클립보드 권한 거부 (Safari, http 환경)
- `writeText` reject → catch 없음.
- **Phase 2**: catch → `window.prompt("이 링크를 복사하세요", url)` 폴백.

### 5.5 매우 큰 body (50KB 가까이)
- 백엔드 zod max 50_000. 초과하면 PATCH 400.
- **Phase 2**: textarea char counter + 한도 도달 시 warning.

### 5.6 share token 발급 후 사용자가 회수하고 싶음
- 현재: UI 없음. **Phase 2**: 공유 모달 안에 "공유 중지" 버튼 → `DELETE :id/share` → token NULL.

### 5.7 `?summarize=1` query로 진입
- 현재: query 무시. **Phase 2**: useEffect로 자동 `POST :id/summarize` 1회 호출, body 갱신.

### 5.8 노트가 백그라운드에서 삭제됨 (예: 다른 디바이스에서 delete)
- 저장 시 PATCH 404 → 현재 silent. **Phase 2**: "이 노트는 삭제되었습니다" 모달 + 목록 redirect.

### 5.9 동시 share 버튼 더블 클릭
- `setSharing(true)`로 1차 차단되지만 click event 동시 발생 가능. 백엔드는 idempotent이라 안전.

### 5.10 `body` 안의 사용자 입력 (예: `<script>` 같은 HTML)
- 현재: `<pre>` 안에 plain text로 표시 → XSS 안전.
- Markdown 렌더링 (Phase 2)을 도입하면 `react-markdown` + `rehype-sanitize` 필수.

## 6. 변경 시 영향 범위

- `MeetingNote` interface — list 페이지와 다름 (이쪽이 전체). 추가 필드는 백엔드 routes.ts:88-89에 매핑.
- `?summarize=1` query — `/meetings/new`가 이 query를 부착. 변경 시 양쪽 수정.
- 내보내기 URL — `process.env.NEXT_PUBLIC_API_URL` 의존. 환경 변수 누락 시 깨짐 (방어 필요).
