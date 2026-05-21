import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { getBotDb } from "@/lib/slack-bot/db";
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

  try {
    const db = getBotDb();
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

  return NextResponse.json({ response_action: "clear" });
}
