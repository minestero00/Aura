# `share/[token]/` — 공개 공유 페이지 (`/share/[token]`)

회의록 1건을 인증 없이 누구든 읽을 수 있는 read-only 페이지. **Server Component (SSR)**.

## 책임
- `GET /business/meetings/share/:token` 백엔드 호출 (인증 헤더 없음)
- 응답 데이터로 SSR 페이지 렌더 (title, body, createdAt만 노출)
- token 무효 시 `notFound()` → Next 기본 404
- `generateMetadata`로 title 메타 (SEO 및 공유 미리보기)
- 페이지 하단에 "AURA Business 시작하기" 마케팅 CTA

## 절대 금지
- 클라이언트 컴포넌트로 만들지 말 것 — SSR로 SEO + 초기 로딩 속도 확보.
- `rawTranscript`, `userId`, 다른 어떤 메타데이터도 절대 노출 X. 백엔드 응답에 포함돼 있어도 무시.
- token을 URL에서 파싱 후 다른 사용자 정보 추측 시도 금지 (token은 random 160-bit hex).
- `body`를 raw HTML로 렌더링 금지 (현재는 `<pre>` plain text — 안전). markdown 렌더 도입 시 `rehype-sanitize` 필수.
- localStorage·cookie·sessionStorage 사용 금지 — 공개 페이지에 사용자 식별 흔적 남기지 말 것.

## 항상 지킬 것
- `notFound()`로 404 처리 (string return X)
- `next: { revalidate: 60 }` ISR 캐싱 (60초)
- `apiUrl` 폴백: `process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1"`
- 페이지에서 외부 인증 prompt X (공개니까)
- robots 메타 별도 정책 (TBD — 검색 노출 허용 여부)

## 외부 통신
- `GET /business/meetings/share/:token` (백엔드, 인증 없음)

## edge case 처리 (자세한 건 [workflow.md](./workflow.md))
- 무효 token → 404
- 노트 삭제됨 → 404 (token도 같이 사라짐)
- share 회수됨 (Phase 2) → 404
- 백엔드 down → 404 (catch swallowed)
- revalidate cache 안에서 노트 수정 → 최대 60초 stale
- SEO 크롤러 → metadata 노출, 본문은 SSR
