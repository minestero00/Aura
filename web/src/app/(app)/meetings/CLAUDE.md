# `meetings/` — 회의록 목록 페이지 (`/meetings`)

회의록 목록 화면. 본인 소유 노트만 표시.

## 책임
- `GET /business/meetings?limit=50` 호출 (SWR)
- 날짜별 그룹핑 (작성일 기준 한국어 로케일)
- 각 카드: 제목 + 시간 + 템플릿 라벨 + 상태(draft/done) + 공유 여부 배지
- 빈 상태 / 로딩 스켈레톤 / 새 회의 CTA
- 카드 클릭 → `/meetings/{id}` 이동

## 절대 금지
- 이 페이지에서 회의 **생성** 로직 추가하지 말 것 → `/meetings/new`의 책임.
- 노트 본문(`body`) fetch 금지 — 목록 응답에 의도적으로 제외되어 있음. 본문은 detail에서 lazy 로드.
- 클라이언트에서 정렬·필터 추가 금지 — 백엔드 `ORDER BY created_at DESC` 그대로 사용. 정렬 옵션은 server-side로.
- SWR `mutate` 호출 없이 직접 fetch 금지 (revalidation 흐름 깨짐).

## 항상 지킬 것
- list 응답 타입은 `{ id, title, status, createdAt, templateId, shareToken }` 만 가정. 추가 필드 사용 시 백엔드 routes.ts:38-43에 매핑 추가 후 사용.
- 로딩 중에는 5줄 skeleton, 빈 상태에는 명시적 안내 + CTA.
- `templateId`는 null 가능 → `TEMPLATE_LABELS[id] ?? id` 폴백 강제.

## 외부 통신
- `/business/meetings?limit=50` (SWR auto-revalidate on focus)

## edge case 처리 (자세한 건 [workflow.md](./workflow.md))
- 미로그인 → middleware가 `/login` redirect (이 페이지 진입 자체가 막힘)
- Business 만료 → 페이지는 보이되 "새 회의" 클릭 시 백엔드 403 (현재 처리 없음 → Phase 2 토스트)
- 50건 초과 → 페이지네이션 미지원, 최근 50건만. Phase 2: infinite scroll
