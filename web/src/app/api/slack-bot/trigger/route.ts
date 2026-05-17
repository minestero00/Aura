import { NextRequest, NextResponse } from "next/server";

/**
 * 즉시 요약 실행 — backend의 /v1/slack-bot/trigger 호출.
 * Backend가 fire-and-forget으로 digest를 백그라운드 실행하고 응답은 즉시.
 * 결과는 Slack 채널 메시지로 도착 (~5-30s 이내).
 *
 * 이전엔 manual_trigger=true 플래그만 세팅하고 30분 폴링 기다렸지만,
 * 사용자 경험 개선을 위해 즉시 실행 endpoint로 전환.
 */
export async function POST(req: NextRequest) {
  const installationId = req.cookies.get("bot_session")?.value;
  if (!installationId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  const secret = process.env.SLACK_BOT_TRIGGER_SECRET;
  if (!apiUrl || !secret) {
    return NextResponse.json(
      {
        error: "trigger_not_configured",
        missing: [
          !apiUrl && "NEXT_PUBLIC_API_URL",
          !secret && "SLACK_BOT_TRIGGER_SECRET",
        ].filter(Boolean),
      },
      { status: 500 },
    );
  }

  try {
    const resp = await fetch(`${apiUrl}/slack-bot/trigger`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-trigger-secret": secret },
      body: JSON.stringify({ installationId }),
    });
    const body = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      return NextResponse.json(
        { error: "backend_failed", status: resp.status, ...body },
        { status: resp.status },
      );
    }
    return NextResponse.json({ ok: true, ...body });
  } catch (err) {
    const e = err as Error;
    return NextResponse.json({ error: "fetch_failed", message: e.message }, { status: 502 });
  }
}
