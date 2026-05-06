# `features/chat/` — Aura Chat (대화형 답변)

## 책임
- 사용자 질문 입력 + 전송
- **SSE 스트리밍** 응답 토큰 단위 표시
- 메시지 히스토리 로컬 캐시

## 핵심 파일
- `api.ts` — `POST /chat/stream` SSE 파싱
- `useChat.ts` — 메시지 state + 스트림 핸들러
- 화면 자체는 `features/app/screens/ask-screen.tsx`에 임베디드

## 외부 의존
- 백엔드 `/chat/stream`
- React Native fetch + ReadableStream polyfill

## 절대 금지
- 스트림 도중 사용자가 화면 이탈 시 abort 누락 (메모리 누수 + 백엔드 비용).
- 메시지 입력란 내용을 매 키 입력마다 백엔드 ping (debounce 또는 submit only).
- 스트림 청크를 setState로 매 토큰 호출 — 50ms 단위로 batch.

## 항상 지킬 것
- AbortController는 컴포넌트 unmount + 새 메시지 전송 시 모두 abort.
- 에러 메시지는 시스템 메시지 형식으로 inline 표시 (alert 금지).

## 최적화 포인트
- ask-screen 메모이제이션 (#12) — 본 feature와 직접 관련.
