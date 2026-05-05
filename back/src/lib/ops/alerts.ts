import { config } from "../../config/env.js";

const ALERT_TIMEOUT_MS = 5_000;

interface AlertContext {
  level: "info" | "warning" | "critical";
  title: string;
  message: string;
  fields?: Record<string, string | number>;
}

function logAlert(context: AlertContext) {
  console.log(
    JSON.stringify({
      level: context.level,
      service: "aura-back",
      module: "ops-alert",
      message: context.title,
      detail: context.message,
      ...(context.fields ?? {})
    })
  );
}

async function postSlack(webhookUrl: string, context: AlertContext) {
  const emoji =
    context.level === "critical" ? ":rotating_light:" : context.level === "warning" ? ":warning:" : ":information_source:";
  const fieldLines = context.fields
    ? Object.entries(context.fields).map(([key, value]) => `• *${key}*: ${value}`)
    : [];
  const text = `${emoji} *${context.title}*\n${context.message}${
    fieldLines.length ? `\n${fieldLines.join("\n")}` : ""
  }`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ALERT_TIMEOUT_MS);
  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      signal: controller.signal,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text })
    });
    return response.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

async function postDiscord(webhookUrl: string, context: AlertContext) {
  const colorMap: Record<AlertContext["level"], number> = {
    info: 0x4a90e2,
    warning: 0xff8a4c,
    critical: 0xff3b5c
  };
  const fields = context.fields
    ? Object.entries(context.fields).map(([name, value]) => ({
        name,
        value: String(value),
        inline: true
      }))
    : [];

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ALERT_TIMEOUT_MS);
  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      signal: controller.signal,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        embeds: [
          {
            title: context.title,
            description: context.message,
            color: colorMap[context.level],
            fields,
            timestamp: new Date().toISOString()
          }
        ]
      })
    });
    return response.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

export async function dispatchOpsAlert(context: AlertContext) {
  logAlert(context);

  const slackUrl = process.env.OPS_SLACK_WEBHOOK_URL;
  const discordUrl = process.env.OPS_DISCORD_WEBHOOK_URL;

  if (slackUrl) {
    void postSlack(slackUrl, context).catch(() => undefined);
  }
  if (discordUrl) {
    void postDiscord(discordUrl, context).catch(() => undefined);
  }
}
