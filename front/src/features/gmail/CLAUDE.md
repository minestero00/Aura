# `features/gmail/` — 메일 (Gmail 연동)

## 책임
- Gmail 계정 연결/해제 화면
- 다이제스트 + 최근 메일 fetch
- 중요 메일 카드 (Mail 탭)

## 핵심 파일
- `api.ts` — `fetchGmailSummary`, `fetchRecentGmailMessages`
- 화면은 `features/app/screens/mail-screen.tsx`에 임베디드

## 외부 의존
- 백엔드 `/gmail/*`
- 기기 OAuth flow는 백엔드가 처리 (브라우저 redirect)

## 절대 금지
- 다이제스트 + recent를 동시 호출하고 결과를 단순 concat — 메일 ID로 중복 제거.
- 메일 본문을 클라이언트에서 다시 LLM에 보내기 (백엔드 요약만 사용).
- ignored sender 룰을 클라이언트에 저장 — 백엔드 user_preferences가 source of truth.

## 항상 지킬 것
- refresh failure (401 응답) 시 `connected_accounts` 재연결 모달 표시.
- 다이제스트 빈 상태에서도 placeholder 카드 + onboarding 링크.

## 최적화 포인트
- 다이제스트 응답을 5분 메모리 캐시 (탭 전환 시 재요청 방지).
