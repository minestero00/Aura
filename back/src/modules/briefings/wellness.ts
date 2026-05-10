/**
 * 어제 health 데이터를 기반으로 한 줄 톤 조절 문구를 생성한다 (LLM 호출 없음).
 * 데이터가 부분적이거나(예: 수면만 있음) null이면 가능한 만큼만 활용.
 */
export function buildWellnessTip(
  language: "en" | "ko",
  yesterday: {
    sleepMinutes: number | null;
    steps: number | null;
    avgHrBpm: number | null;
  } | null
): string | null {
  if (!yesterday) return null;
  const { sleepMinutes, steps } = yesterday;
  const ko = language === "ko";

  if (sleepMinutes != null) {
    if (sleepMinutes < 5 * 60) {
      return ko
        ? `어제 수면이 ${(sleepMinutes / 60).toFixed(1)}시간으로 부족했어요. 오늘은 무리하지 말고 가볍게 시작해보세요.`
        : `You slept only ${(sleepMinutes / 60).toFixed(1)}h yesterday — take it easy today.`;
    }
    if (sleepMinutes >= 7 * 60 && sleepMinutes <= 9 * 60) {
      return ko
        ? `어제 ${(sleepMinutes / 60).toFixed(1)}시간 잘 주무셨네요. 오늘 컨디션 좋을 거예요.`
        : `Solid ${(sleepMinutes / 60).toFixed(1)}h of sleep yesterday — you should feel sharp today.`;
    }
  }

  if (steps != null && steps < 3000) {
    return ko
      ? `어제 걸음 수가 ${steps.toLocaleString("ko-KR")}보로 적었어요. 오늘은 잠깐 산책 어떠세요?`
      : `Only ${steps.toLocaleString("en-US")} steps yesterday — a short walk could help today.`;
  }

  return null;
}
