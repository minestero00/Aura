import { NextRequest, NextResponse, after } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { getBotDb } from "@/lib/slack-bot/db";
import { decrypt } from "@/lib/slack-bot/crypto";
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

interface ViewSubmission {
  type: "view_submission";
  user: { id: string };
  view: {
    callback_id: string;
    private_metadata: string;
    state: { values: Record<string, Record<string, ViewValue>> };
  };
}

interface ViewValue {
  type: string;
  value?: string;
  selected_time?: string;
  selected_option?: { value: string } | null;
  selected_options?: { value: string }[];
}

function readSingleValue(
  values: Record<string, Record<string, ViewValue>>,
  blockId: string,
): ViewValue | undefined {
  const block = values[blockId];
  if (!block) return undefined;
  const firstKey = Object.keys(block)[0];
  return firstKey ? block[firstKey] : undefined;
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  if (!verifySlackSignature(rawBody, req)) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const params = new URLSearchParams(rawBody);
  const payloadRaw = params.get("payload");
  if (!payloadRaw) return NextResponse.json({});

  let payload: ViewSubmission;
  try {
    payload = JSON.parse(payloadRaw) as ViewSubmission;
  } catch {
    return NextResponse.json({});
  }

  if (payload.type !== "view_submission") {
    return NextResponse.json({});
  }

  if (payload.view.callback_id === "aura_settings_submit") {
    return handleSettingsSubmit(payload);
  }
  return NextResponse.json({});
}

async function handleSettingsSubmit(payload: ViewSubmission) {
  const installationId = payload.view.private_metadata;
  if (!installationId) {
    return NextResponse.json({
      response_action: "errors",
      errors: { digest_time: "세션 정보가 누락되었습니다. 다시 시도해주세요." },
    });
  }

  const values = payload.view.state.values;

  const digestTime = readSingleValue(values, "digest_time")?.selected_time ?? "09:00";
  const timezone =
    readSingleValue(values, "timezone")?.selected_option?.value ?? "Asia/Seoul";
  const digestDays =
    readSingleValue(values, "digest_days")?.selected_options?.map(o => o.value) ?? [];
  const summaryLang =
    readSingleValue(values, "summary_lang")?.selected_option?.value ?? "ko";
  const includeDiffs =
    (readSingleValue(values, "include_diffs")?.selected_options?.length ?? 0) > 0;
  const customPrompt = readSingleValue(values, "custom_prompt")?.value ?? "";

  if (digestDays.length === 0) {
    return NextResponse.json({
      response_action: "errors",
      errors: { digest_days: "최소 1개 요일을 선택해주세요." },
    });
  }

  const db = getBotDb();
  let botToken: string | null = null;
  let channelId: string | null = null;
  try {
    const { data: inst, error: selErr } = await db
      .from("bot_installations")
      .select("slack_bot_token, slack_channel_id")
      .eq("id", installationId)
      .maybeSingle();
    if (selErr) throw new Error(selErr.message);
    if (inst?.slack_bot_token) {
      try {
        botToken = decrypt(inst.slack_bot_token);
      } catch {
        botToken = null;
      }
    }
    channelId = inst?.slack_channel_id ?? null;

    const { error } = await db
      .from("bot_installations")
      .update({
        digest_time: digestTime,
        timezone,
        digest_days: digestDays,
        summary_lang: summaryLang,
        include_diffs: includeDiffs,
        custom_prompt: customPrompt || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", installationId);
    if (error) throw new Error(error.message);
  } catch (e) {
    console.error("[interactions] settings save failed:", e);
    void notifyOps("settings save failed", {
      installationId,
      error: (e as Error)?.message,
    });
    return NextResponse.json({
      response_action: "errors",
      errors: { digest_time: "저장 실패. 잠시 후 다시 시도해주세요." },
    });
  }

  // 저장 성공 시 디지스트 채널에 ephemeral 메시지 — 본인만 보이고, 다른 멤버를 방해하지 않음.
  // (bot은 이미 그 채널에 있으므로 chat:write만으로 ok, im:write 같은 추가 scope 불필요)
  // Slack 3초 응답 제한 안에 끝나야 하므로 after()로 비동기 처리.
  const userId = payload.user.id;
  if (botToken && channelId && userId) {
    const daysKo: Record<string, string> = { mon: "월", tue: "화", wed: "수", thu: "목", fri: "금", sat: "토", sun: "일" };
    const dayStr = digestDays.map(d => daysKo[d] ?? d).join("·");
    after(async () => {
      try {
        const res = await fetch("https://slack.com/api/chat.postEphemeral", {
          method: "POST",
          headers: {
            "Content-Type": "application/json; charset=utf-8",
            Authorization: `Bearer ${botToken}`,
          },
          body: JSON.stringify({
            channel: channelId,
            user: userId,
            text: `✅ AURA Bot 설정이 저장되었습니다. (${digestTime} ${timezone} · ${dayStr})`,
          }),
        });
        const json = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
        if (!json?.ok) {
          console.error("[interactions] save confirm ephemeral failed:", json?.error);
        }
      } catch (err) {
        console.error("[interactions] save confirm ephemeral threw:", err);
      }
    });
  }

  return NextResponse.json({ response_action: "clear" });
}
