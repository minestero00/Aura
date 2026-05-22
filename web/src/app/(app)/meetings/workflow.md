# `meetings/` workflow

목록 페이지 데이터·UI flow 명세.

## 1. 진입 시점

1. 사용자가 사이드바 `회의록` 클릭, 또는 대시보드 "Recent notes 더보기" → `/meetings`
2. middleware (`web/src/middleware.ts`) — Slack session 쿠키 검증 → 없으면 `/login`
3. App layout (`(app)/layout.tsx`) — Sidebar 렌더링
4. 페이지 컴포넌트 `MeetingsPage` 클라이언트에서 SWR 호출

## 2. 데이터 fetch

```
SWR key: "/business/meetings?limit=50"
fetcher: api.get<MeetingNote[]>(p)
```

- `api.get`은 `NEXT_PUBLIC_API_URL` + Bearer 토큰 자동 부착 (`web/src/lib/api.ts` 참고)
- 인증 만료 시 401 → `api`가 throw → SWR error 상태 → 현재는 silent (UI에는 "불러오는 중…" 유지)

## 3. 렌더링 분기

| 상태 | UI |
|---|---|
| `isLoading` (첫 요청 진행 중) | 5개 skeleton row (`h-16 skeleton rounded-[12px]`) |
| `notes == null` 또는 `notes.length === 0` | 빈 카드 + 안내 + "첫 회의 시작하기" CTA |
| `notes.length > 0` | 날짜별 그룹 (`grouped` 객체) → 그룹 헤더 + 카드 list |

## 4. 그룹핑 로직

```ts
grouped = notes.reduce<Record<string, MeetingNote[]>>((acc, note) => {
  const key = new Date(note.createdAt).toLocaleDateString("ko-KR", {...});
  (acc[key] ??= []).push(note);
  return acc;
}, {})
```

- key는 `"2026년 5월 22일"` 한국어 포맷
- `notes`는 이미 백엔드에서 `created_at DESC`로 정렬됐으므로 그룹 순서도 자동으로 최신순
- 단, 그룹 내부 정렬도 같은 순서로 유지됨 (push 순서 == 백엔드 순서)

## 5. 카드 구성요소

각 카드 (Link → `/meetings/{id}`):
- 아이콘 (왼쪽, 9x9 rounded square, aurora-soft 배경)
- 제목 (truncate, 13px medium)
- 시간 (`fmtTime`, 11px muted)
- 템플릿 라벨 배지 (templateId 있을 때만)
- "공유됨" 배지 (shareToken 있을 때만, success 색상)
- 상태 배지: `완료` (success-soft) / `작성 중` (warning-soft)
- ▶ chevron (hover시 opacity 30→70)

## 6. 사용자 액션 → 결과

| 액션 | 결과 |
|---|---|
| 카드 클릭 | `/meetings/{id}` 이동 |
| "새 회의록" 헤더 버튼 | `/meetings/new` 이동 |
| 빈 상태 "첫 회의 시작하기" | `/meetings/new` 이동 |
| 뒤로가기 (브라우저) | 이전 페이지 |
| 새로고침 | SWR cache invalidation 후 재fetch |

## 7. Edge case 자세히

### 7.1 미로그인
- middleware가 `/login`으로 redirect → 이 페이지 코드는 실행 X.

### 7.2 fetch 실패 (500/네트워크)
- SWR `error` 상태. **현재 UI**: 로딩 스피너 유지 (silent).
- **Phase 2 개선**: error 상태 시 "데이터를 불러올 수 없습니다 [다시 시도]" 배너.

### 7.3 fetch 401 (세션 만료)
- `api.get`이 throw → SWR error. 현재 UI 변화 없음.
- **Phase 2**: error 메시지가 `unauthorized`면 자동 `/login?next=/meetings` redirect.

### 7.4 Business 구독 만료
- 목록 자체는 `requireBusinessAccess` 가드 없음 → 정상 노출.
- "새 회의록" 버튼은 누를 수 있지만 `/meetings/new`에서 저장 시도 시 403.
- **Phase 2**: 페이지 상단에 "구독 만료 — 새 회의 생성 불가 [재구독]" 배너.

### 7.5 노트 50건 초과
- 현재: 최근 50건만. 51번째 노트는 보이지 않음.
- **Phase 2**: infinite scroll 또는 페이지네이션. `limit` 50 유지, `offset` 추가.

### 7.6 SWR 자동 revalidate (focus 이벤트)
- 다른 탭에서 회의 추가/삭제 후 이 탭 focus → 자동 새로고침.
- 의도된 동작 — 별도 처리 X.

### 7.7 잘못된 응답 형식 (백엔드 버그)
- `notes`가 배열 아닌 경우 `notes?.length === 0` 체크에 걸려 빈 상태 표시.
- console에는 SWR이 던지는 에러만 보임. crash X.

## 8. 변경 시 영향 범위

이 페이지를 수정할 때 다음도 같이 확인:
- 백엔드 `back/src/modules/meetings/routes.ts` GET / handler — 응답 필드 변경 시
- `MeetingNote` interface — 다른 곳 (`/meetings/[id]/page.tsx`, dashboard)에서도 사용
- list/detail 응답 구조가 다름에 주의 (list는 축약, detail은 전체)
