# `modules/voice/` — Whisper STT

OpenAI Whisper API 음성 → 텍스트 변환. `/api/v1/voice/transcribe`.

## 책임
- 단일 오디오 파일 업로드 (multer memory storage, max 25MB, max 1 file)
- OpenAI Whisper API 호출 (`whisper-1` 모델, verbose_json)
- `usageService.consumeOrThrow({ feature: "voice_transcribe" })` 일일 한도 강제
- 텍스트 + duration 응답

## 절대 금지
- 디스크 저장 X (`multer.memoryStorage`만) — 회의 음성은 transient. 영속 저장 시 별도 보안 설계 필요.
- audio buffer를 로그/DB에 출력 X.
- `usageService.consumeOrThrow` 호출 전에 Whisper API hit 금지 — 비용 폭주 방지.
- OPENAI_API_KEY 없으면 `503 VOICE_UNCONFIGURED` 명시적으로 반환. 무음 응답 X.
- 25MB 초과 multer 자동 413 → 우회해서 직접 fetch 호출 금지.
- timeout 없이 fetch 금지 — Whisper 자체가 길게 hang하면 worker 멈춤.

## 항상 지킬 것
- `WHISPER_TIMEOUT_MS = 30_000` — 30초 안에 응답 못 받으면 AbortController로 cancel.
- mimeType 폴백 `"audio/m4a"` (브라우저가 안 보내는 경우).
- usage 차감은 API call 전, 응답 실패 시에도 한도 차감됨 (의도 — 악용 방지). Phase 2: 응답 200일 때만 차감하는 옵션 검토.
- 응답 JSON `text`가 string 아니면 빈 문자열로 폴백.
- `language` query 미지정 시 Whisper 자동 감지 (한국어/영어 혼용 회의 OK).

## 비용

- $0.006/min (input audio 길이 기준)
- 10분 회의 = $0.06
- 일일 한도는 env `USAGE_DAILY_VOICE_TRANSCRIBE` (현재 미설정 시 무제한 — **위험**, Phase 2에서 default 추가 필요)
- 회의록 기능 활성화 시 일평균 30분 가정 → $0.18/user/day

## 외부 의존성
- OpenAI API (`OPENAI_API_KEY` env)
- `usageService.consumeOrThrow` (Redis/in-memory rate limit + DB quota)
- `AppError` 헬퍼

## error codes

| code | http | 의미 |
|---|---|---|
| `VOICE_UNCONFIGURED` | 503 | OPENAI_API_KEY 미설정 |
| `VOICE_FILE_REQUIRED` | 400 | multipart `audio` 필드 누락 |
| `VOICE_TRANSCRIBE_FAILED` | 502 | Whisper API 실패 (네트워크/타임아웃/non-200) |
| `USAGE_LIMIT_EXCEEDED` | 429 | usageService에서 throw |

## Phase 2 검토 사항

- **청크 streaming**: 현재는 단일 파일 업로드만. 실시간 자막을 위해 5-10s 청크 단위 업로드 + 각 청크별 빠른 응답. 또는 Soniox/Deepgram WebSocket 도입.
- **언어 감지 결과 응답에 포함**: verbose_json은 `language` 필드 제공 — 현재 무시. UI에 표시하면 디버깅 ↑.
- **음성 파일 영속 저장 (audit)**: 현재 buffer 폐기. 변경 시 AES-256-GCM 암호화 + 90일 cleanup + S3/Vercel Blob 어디에 둘지 결정.
- **speaker diarization**: Whisper 자체는 지원 X. Phase 3 P3.
