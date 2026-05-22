# `share/[token]/` workflow

공개 공유 페이지 SSR flow.

## 1. 진입

진입 경로:
- 외부 (Slack/이메일/카톡) 에서 공유받은 링크 클릭
- 노트 작성자 본인이 공유 발급 직후 동일 도메인 접근 (테스트 용도)

middleware → **`/share/`는 인증 가드 우회** (middleware matcher에서 제외 — `web/src/middleware.ts` 확인).

## 2. SSR fetch

```ts
async function fetchSharedNote(token: string): Promise<SharedNote | null> {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";
    const res = await fetch(`${apiUrl}/business/meetings/share/${token}`, {
      next: { revalidate: 60 }
    });
    if (!res.ok) return null;
    return res.json() as Promise<SharedNote>;
  } catch {
    return null;
  }
}
```

- 60초 ISR — 같은 token으로 1분 이내 재요청은 캐시 응답
- 모든 에러 (네트워크, JSON 파싱) → null → `notFound()`

## 3. generateMetadata

```ts
export async function generateMetadata({ params }) {
  const { token } = await params;
  const note = await fetchSharedNote(token);
  return {
    title: note ? `${note.title} — AURA Business` : "회의록 — AURA Business"
  };
}
```

- title을 OG 미리보기에 노출 (Slack/카톡 unfurling)
- `description`은 현재 미설정 — Phase 2: body 200자 truncate
- 무효 token일 때도 generic title

## 4. 렌더링

```
┌────────────────────────────────────────┐
│ [AuraLogo] AURA Business     [공유 회의록]│ ← sticky header
├────────────────────────────────────────┤
│                                        │
│   ┌────────────────────────────────┐  │
│   │ [회의 제목]                     │  │
│   │ [작성 시간]                     │  │
│   ├────────────────────────────────┤  │
│   │ [body markdown source as <pre>]│  │
│   └────────────────────────────────┘  │
│                                        │
│   AURA Business로 회의를 더 스마트하게 →│
└────────────────────────────────────────┘
```

## 5. Edge case 자세히

### 5.1 무효 token (잘못 입력 / typo / 만료)
- 백엔드 404 → fetch !ok → null → `notFound()` → Next 기본 404 페이지

### 5.2 노트 삭제됨
- 노트가 DELETE 되면 share_token도 row 자체와 같이 사라짐
- 다음 share 접근 시 404 (동일 처리)

### 5.3 share 회수 (Phase 2 `DELETE :id/share`)
- 백엔드가 `share_token = NULL` UPDATE
- 기존 link 즉시 404 처리됨

### 5.4 백엔드 다운 / 네트워크 에러
- fetch throw → catch → null → 404
- 사용자에게는 무효 link와 구분되지 않음
- **Phase 2**: error 종류 구분해서 "일시적 오류" UI

### 5.5 60초 cache 안에서 노트 수정
- 사용자 A가 share 받아 보고 있는 동안 작성자 B가 노트 수정
- A는 60초 동안 옛 버전 본다
- 의도된 trade-off — 매 요청 DB hit 방지

### 5.6 매우 큰 body (50KB)
- SSR이 50KB markdown을 HTML로 변환 → 응답 크기 OK
- Phase 2 markdown 렌더 도입 시 더 무거워짐 → CDN 캐싱 필요

### 5.7 SEO 크롤러 (Google, Bing)
- title metadata 노출됨
- 본문도 SSR이라 크롤링 가능
- **정책 결정 필요**: 공유 노트가 검색 결과에 뜨는 게 OK? 아니면 `robots: noindex`?
- 현재는 `noindex` 메타 없음 → 인덱싱 가능. Phase 2에서 정책 확정 후 메타 추가.

### 5.8 token brute force 시도
- 160 bit 엔트로피 (20 bytes hex). 2^159 시도 필요 — 사실상 불가능.
- 백엔드 rate limit (60/min IP) 추가 보호.

### 5.9 SSR 캐시와 사용자별 컨텍스트
- 페이지는 사용자 식별 X. 모든 방문자에게 같은 응답 → ISR 안전.

### 5.10 mobile share view
- 현재 max-w-2xl 컨테이너 + responsive padding. 모바일에서도 정상 노출.

## 6. 변경 시 영향 범위

- `SharedNote` interface — 백엔드 routes.ts:73-78 응답 구조와 동기화. 추가 필드 노출 시 보안 검토 필수.
- `revalidate: 60` — 변경 시 stale 윈도우 영향. 너무 짧으면 DB load ↑, 너무 길면 회수 후에도 노출 가능.
- AURA Business CTA 카피 — 마케팅 팀과 협의.
