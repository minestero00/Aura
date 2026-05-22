# `modules/voice/` workflow

Whisper 전사 처리 흐름.

## 1. 요청 받기

```
POST /api/v1/voice/transcribe
  Authorization: Bearer <jwt>
  Content-Type: multipart/form-data
    audio: <Blob | File>
    language?: "ko" | "en" | ...
```

multer가 `req.file`로 파싱. `req.file.buffer`에 raw bytes.

### multer 설정 (`routes.ts:9-12`)
- `storage: memoryStorage()` — 디스크 X
- `limits.fileSize: 25 * 1024 * 1024` — 25MB
- `limits.files: 1` — 1개만

### Edge cases (multer 단)
- 25MB 초과 → 자동 413 `LIMIT_FILE_SIZE`
- 여러 파일 첨부 → 자동 `LIMIT_FILE_COUNT`
- audio 필드 누락 → req.file undefined → handler가 `VOICE_FILE_REQUIRED` 400
- audio가 비어있는 파일 → buffer.length=0 → Whisper API가 400, handler가 `VOICE_TRANSCRIBE_FAILED` 502

## 2. usage 가드

```ts
await usageService.consumeOrThrow({
  userId: req.authUser!.id,
  feature: "voice_transcribe"
});
```

- 분당 rate limit + 일일 quota 둘 다 체크
- 초과 시 `AppError(429, "USAGE_LIMIT_EXCEEDED", ...)` throw
- **이 호출은 Whisper API 호출 전에 무조건 — 비용 가드**
- usage 차감은 차감 후 throw 가능 — 한도 도달 시 다음 요청부터 차단

## 3. FormData 구성 → Whisper API

```ts
const formData = new FormData();
const blob = new Blob([new Uint8Array(input.audio)], { type: input.mimeType });
formData.append("file", blob, input.filename ?? "audio.m4a");
formData.append("model", "whisper-1");
formData.append("response_format", "verbose_json");
if (input.language) formData.append("language", input.language);
```

- `Uint8Array` wrapping — Buffer가 SharedArrayBuffer일 때 Blob 호환성
- `response_format: verbose_json` → 응답에 `text`, `duration`, `language`, `segments`...
- `language` 지정 시 더 정확. 미지정 시 자동 감지 (혼용 회의는 미지정 권장).

## 4. fetch with timeout

```ts
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 30_000);

try {
  response = await fetch(WHISPER_ENDPOINT, {
    method: "POST",
    signal: controller.signal,
    headers: { authorization: `Bearer ${apiKey}` },
    body: formData
  });
} catch (error) {
  throw new AppError(502, "VOICE_TRANSCRIBE_FAILED", "Failed to reach Whisper API.", { reason });
} finally {
  clearTimeout(timeout);
}
```

- 30초 timeout — Whisper 1분 오디오 평균 ~10s, 25MB는 ~60-90s. 25MB 가까이면 timeout 위험.
- 네트워크 에러는 fetch가 throw → AppError 502.

### Edge cases
- 매우 큰 오디오 (25MB 가까이) → Whisper 처리 시간 초과 → AbortError. **Phase 2**: 청크 단위로 자르거나 timeout 60s로 늘림.
- Whisper API 다운 → 502
- API key 잘못됨 (401) → response.ok=false → 502 `VOICE_TRANSCRIBE_FAILED` body에 status:401

## 5. 응답 파싱

```ts
const payload = await response.json();
return {
  text: typeof payload.text === "string" ? payload.text.trim() : "",
  durationSeconds: typeof payload.duration === "number" ? payload.duration : null
};
```

- text trim
- text 누락 시 빈 문자열 (silent — 클라이언트가 "음성 없음" 표시)
- duration null 가능

### Edge cases
- 무음 (silent audio) → text="" → 사용자가 STT 실패로 오해. **Phase 2**: 응답에 `silence: true` 플래그 또는 명시적 안내.
- 매우 짧은 오디오 (<0.1s) → Whisper가 400. 502로 마스킹됨.
- 비음성 (음악·소음) → 무의미한 transcript 반환 가능. 필터링 X (사용자 책임).

## 6. handler 응답

```ts
res.json({
  ok: true,
  text: result.text,
  durationSeconds: result.durationSeconds
});
```

- 항상 200 (실패는 위에서 throw → asyncHandler가 적절한 HTTP 코드 매핑)
- frontend는 `text`만 사용

## 7. Phase 2 — 청크 streaming 설계

목표: 사용자가 "녹음 중"이라고 인지하는 동안 자막이 실시간 갱신 (~3-5s 지연).

방안 A: HTTP 청크 업로드
- 5-10s 단위로 MediaRecorder가 chunk emit
- 각 chunk를 별도 POST `/voice/transcribe`
- 응답을 transcript[] 에 append
- 단점: 청크 사이 단어가 잘림 (Whisper는 청크 경계 모름)
- 보완: 1초 overlap + 클라이언트 dedup

방안 B: WebSocket (Soniox, Deepgram 등)
- 진정한 streaming
- 단점: OpenAI Whisper는 미지원 → 다른 vendor
- 비용 더 높음 ($0.0075/min ~ $0.01/min)

**1차 권장: 방안 A**. UX는 OK, 코드 변경 최소.

## 8. 변경 시 영향 범위

- `whisper-1` 모델명 변경 → 응답 호환성 검토 (Whisper Large v3 등)
- timeout 변경 → 25MB 가까운 케이스 영향
- usage feature key `voice_transcribe` 변경 → `quota_counters` 마이그레이션 필요
- 응답 형식 변경 → frontend `/meetings/new` Phase 2 호출 코드도 함께
