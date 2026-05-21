// 운영용 알림 — OPS_SLACK_WEBHOOK_URL 설정 시 admin 채널로 에러/이벤트 전송
// fire-and-forget: 실패는 console에만 남기고 호출 측 흐름을 막지 않음
export async function notifyOps(
  title: string,
  details?: Record<string, unknown> | string,
): Promise<void> {
  const url = process.env.OPS_SLACK_WEBHOOK_URL;
  if (!url) return;

  const env = process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "unknown";
  const detailText =
    typeof details === "string"
      ? details
      : details
        ? "```" + JSON.stringify(details, null, 2).slice(0, 2500) + "```"
        : "";

  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: `[AURA·${env}] ${title}`,
        blocks: [
          {
            type: "section",
            text: { type: "mrkdwn", text: `*[AURA·${env}] ${title}*` },
          },
          ...(detailText
            ? [{ type: "section", text: { type: "mrkdwn", text: detailText } }]
            : []),
        ],
      }),
    });
  } catch (e) {
    console.error("[ops] notify failed:", e);
  }
}
