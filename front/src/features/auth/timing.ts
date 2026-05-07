/**
 * 로그인 흐름의 segment별 지연 측정 + 누적 요약.
 *
 * 1) 진행 중에는 console.log로 실시간 한 줄씩 — DevTools가 일찍 열려 있으면 즉시 확인.
 * 2) summarize()를 호출하면 baseline 대비 모든 mark의 ms를 표 형태로 출력 — DevTools가
 *    늦게 열려서 초기 로그를 놓쳐도 한 번에 볼 수 있다.
 *
 * mark 위치 (참고):
 *   start         - handleGoogleSignIn 진입
 *   modal-done    - GoogleSignin.signIn() 반환
 *   sb-call       - supabase.auth.signInWithIdToken() 호출 직전
 *   sb-resolve    - signInWithIdToken 결과 받음 (SDK path)
 *   sb-polled     - getSession 폴링이 세션 발견 (fallback path)
 *   evt-signed-in - onAuthStateChange가 SIGNED_IN 수신
 *   me-call       - fetchMe() 호출
 *   me-done       - fetchMe() 반환
 */

interface MarkRecord {
  label: string;
  at: number;
}

let baseline = 0;
let lastMark = 0;
const records: MarkRecord[] = [];

export function mark(label: string) {
  const now = Date.now();
  if (baseline === 0) {
    baseline = now;
    lastMark = now;
    records.length = 0;
    records.push({ label, at: now });
    console.log(`[timing] ${label.padEnd(14)} 0ms (start)`);
    return;
  }
  const fromStart = now - baseline;
  const delta = now - lastMark;
  lastMark = now;
  records.push({ label, at: now });
  console.log(`[timing] ${label.padEnd(14)} ${fromStart}ms (+${delta}ms)`);
}

export function summarize(reason = "complete") {
  if (records.length === 0) {
    console.log(`[timing] no records (${reason})`);
    return;
  }
  const lines = records.map((r, i) => {
    const fromStart = r.at - records[0].at;
    const delta = i === 0 ? 0 : r.at - records[i - 1].at;
    return `  ${r.label.padEnd(14)} ${String(fromStart).padStart(5)}ms  (+${delta}ms)`;
  });
  console.log(`[timing] === SUMMARY (${reason}) ===\n${lines.join("\n")}`);
  // 다음 sign-in을 위해 초기화
  baseline = 0;
  lastMark = 0;
  records.length = 0;
}

export function resetTiming() {
  baseline = 0;
  lastMark = 0;
  records.length = 0;
}
