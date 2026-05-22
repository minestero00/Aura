import { NextRequest, NextResponse, after } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { getBotDb } from "@/lib/slack-bot/db";
import { decrypt } from "@/lib/slack-bot/crypto";
import { buildSettingsModal } from "@/lib/slack-bot/modal";
import { notifyOps } from "@/lib/slack-bot/ops";

function verifySlackSignature(body: string, req: NextRequest): boolean {
  const timestamp = req.headers.get("x-slack-request-timestamp") ?? "";
  const signature = req.headers.get("x-slack-signature") ?? "";
  const secret = process.env.SLACK_SIGNING_SECRET ?? "";

  if (Math.abs(Date.now() / 1000 - parseInt(timestamp)) > 300) return false;

  const sigBase = `v0:${timestamp}:${body}`;
  const expected = "v0=" + createHmac("sha256", secret).update(sigBase).digest("hex");

  try {
    return timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  if (!verifySlackSignature(rawBody, req)) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const params = new URLSearchParams(rawBody);
  const text = (params.get("text") ?? "").trim().toLowerCase();
  const teamId = params.get("team_id") ?? "";
  const responseUrl = params.get("response_url") ?? "";
  const userId = params.get("user_id") ?? "";
  const triggerId = params.get("trigger_id") ?? "";

  // Slack 3초 제한 — 즉시 응답 후 백그라운드 처리
  // serverless에서 응답 후에도 작업이 끝나도록 after()로 등록
  after(async () => {
    try {
      await handleCommand(text, teamId, responseUrl, userId, triggerId);
    } catch (e) {
      console.error("[slack/commands] handleCommand failed:", e);
      void notifyOps("slash command handler failed", {
        text,
        teamId,
        error: (e as Error)?.message,
      });
      if (responseUrl) {
        await fetch(responseUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            response_type: "ephemeral",
            text: "처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요."
          })
        }).catch(() => {});
      }
    }
  });

  return NextResponse.json({
    response_type: "ephemeral",
    text: "처리 중..."
  });
}

async function handleCommand(
  text: string,
  teamId: string,
  responseUrl: string,
  userId: string,
  triggerId: string,
) {
  switch (text) {
    case "brief":
    case "":
      await handleBrief(teamId, responseUrl);
      break;
    case "setting":
    case "settings":
      await openSettingsModal(teamId, triggerId, responseUrl);
      break;
    case "repos":
      await handleRepos(teamId, responseUrl);
      break;
    default:
      await sendHelp(responseUrl);
  }
}

async function sendToResponseUrl(url: string, payload: object) {
  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
}

async function handleBrief(teamId: string, responseUrl: string) {
  const db = getBotDb();
  const { data } = await db
    .from("bot_installations")
    .select("id, slack_team_name, repos, slack_channel_id")
    .eq("slack_team_id", teamId)
    .eq("is_active", true)
    .maybeSingle();

  if (!data) {
    await sendToResponseUrl(responseUrl, {
      response_type: "ephemeral",
      text: "AURA Bot이 설정되지 않았습니다. <" + process.env.NEXT_PUBLIC_APP_URL + "/slack|설치 페이지>에서 시작해주세요."
    });
    return;
  }

  if (!data.slack_channel_id) {
    await sendToResponseUrl(responseUrl, {
      response_type: "ephemeral",
      text: "전송할 채널이 설정되지 않았습니다. <" + process.env.NEXT_PUBLIC_APP_URL + "/slack/settings|설정 페이지>에서 채널을 선택해주세요."
    });
    return;
  }

  if (!data.repos || (Array.isArray(data.repos) && data.repos.length === 0)) {
    await sendToResponseUrl(responseUrl, {
      response_type: "ephemeral",
      text: "모니터링 중인 레포가 없습니다. <" + process.env.NEXT_PUBLIC_APP_URL + "/slack/settings|설정 페이지>에서 레포를 선택해주세요."
    });
    return;
  }

  // back의 즉시 실행 endpoint 호출 — 30분 워커 폴링을 기다리지 않음
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  const secret = process.env.SLACK_BOT_TRIGGER_SECRET;

  let triggered = false;
  if (apiUrl && secret) {
    try {
      const resp = await fetch(`${apiUrl}/slack-bot/trigger`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-trigger-secret": secret },
        body: JSON.stringify({ installationId: data.id }),
      });
      triggered = resp.ok;
      if (!resp.ok) {
        const body = await resp.text().catch(() => "");
        console.error("[slack/commands] back trigger failed:", resp.status, body);
        void notifyOps("brief trigger failed (back)", { teamId, status: resp.status, body });
      }
    } catch (e) {
      console.error("[slack/commands] back trigger fetch failed:", e);
      void notifyOps("brief trigger fetch failed", { teamId, error: (e as Error)?.message });
    }
  } else {
    console.error("[slack/commands] trigger not configured", { apiUrl: !!apiUrl, secret: !!secret });
    void notifyOps("brief trigger env missing", {
      missing: [!apiUrl && "NEXT_PUBLIC_API_URL", !secret && "SLACK_BOT_TRIGGER_SECRET"].filter(Boolean),
    });
  }

  // back 즉시 실행이 실패해도 워커가 다음 폴링에서 잡을 수 있도록 fallback flag 설정
  if (!triggered) {
    await db.from("bot_installations").update({
      manual_trigger: true,
      updated_at: new Date().toISOString()
    }).eq("slack_team_id", teamId);
  }

  await sendToResponseUrl(responseUrl, {
    response_type: "ephemeral",
    text: triggered
      ? "GitHub 요약을 생성하고 있습니다. 잠시 후 채널에 전송됩니다 (5-30초)."
      : "요약을 큐에 등록했습니다. 백엔드 처리 후 채널에 전송됩니다."
  });
}

async function openSettingsModal(
  teamId: string,
  triggerId: string,
  responseUrl: string,
) {
  const db = getBotDb();
  const { data: inst } = await db
    .from("bot_installations")
    .select("id, slack_bot_token, digest_time, timezone, digest_days, include_diffs, summary_lang, custom_prompt")
    .eq("slack_team_id", teamId)
    .eq("is_active", true)
    .maybeSingle();

  if (!inst?.slack_bot_token) {
    await sendToResponseUrl(responseUrl, {
      response_type: "ephemeral",
      text:
        "AURA Bot이 설정되지 않았습니다. <" +
        process.env.NEXT_PUBLIC_APP_URL +
        "/slack|설치 페이지>에서 시작해주세요.",
    });
    return;
  }

  if (!triggerId) {
    await sendToResponseUrl(responseUrl, {
      response_type: "ephemeral",
      text: "trigger_id를 받지 못했습니다. 다시 시도해주세요.",
    });
    return;
  }

  let token: string;
  try {
    token = decrypt(inst.slack_bot_token);
  } catch (e) {
    console.error("[slack/commands] decrypt failed:", e);
    void notifyOps("bot token decrypt failed", { teamId });
    await sendToResponseUrl(responseUrl, {
      response_type: "ephemeral",
      text: "토큰 복호화에 실패했습니다. 재설치가 필요합니다.",
    });
    return;
  }

  const view = buildSettingsModal({
    installationId: inst.id,
    digestTime: inst.digest_time ?? "09:00",
    timezone: inst.timezone ?? "Asia/Seoul",
    digestDays: inst.digest_days ?? ["mon", "tue", "wed", "thu", "fri"],
    includeDiffs: inst.include_diffs ?? false,
    summaryLang: inst.summary_lang ?? "ko",
    customPrompt: inst.custom_prompt ?? "",
  });

  const res = await fetch("https://slack.com/api/views.open", {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ trigger_id: triggerId, view }),
  });
  const json = (await res.json()) as { ok: boolean; error?: string };
  if (!json.ok) {
    console.error("[slack/commands] views.open failed:", json.error);
    void notifyOps("views.open failed", { teamId, error: json.error });
    await sendToResponseUrl(responseUrl, {
      response_type: "ephemeral",
      text: `설정 창을 열지 못했습니다 (${json.error}).`,
    });
    return;
  }

  // modal이 떴으면 "처리 중..." ephemeral을 짧은 안내 메시지로 갱신.
  // 안 그러면 사용자가 "처리 중..."을 계속 보게 됨.
  await sendToResponseUrl(responseUrl, {
    response_type: "ephemeral",
    text: "⚙️ 설정 창이 열렸습니다.",
  });
}

async function handleRepos(teamId: string, responseUrl: string) {
  const db = getBotDb();
  const { data } = await db
    .from("bot_installations")
    .select("repos, github_org")
    .eq("slack_team_id", teamId)
    .maybeSingle();

  if (!data?.repos?.length) {
    await sendToResponseUrl(responseUrl, {
      response_type: "ephemeral",
      text: "모니터링 중인 레포가 없습니다."
    });
    return;
  }

  const repoList = (data.repos as { name: string }[]).map(r => `• \`${r.name}\``).join("\n");
  await sendToResponseUrl(responseUrl, {
    response_type: "ephemeral",
    text: `*모니터링 중인 레포 (${data.github_org})*\n${repoList}`
  });
}

async function sendHelp(responseUrl: string) {
  await sendToResponseUrl(responseUrl, {
    response_type: "ephemeral",
    text: "*AURA Bot 명령어*\n`/aura brief` — 지금 즉시 요약 실행\n`/aura setting` — 설정 페이지 열기\n`/aura repos` — 모니터링 중인 레포 목록"
  });
}
