import { config } from "../../config/env.js";

const DEFAULT_ANTHROPIC_MODEL = "claude-sonnet-4-20250514";

interface AnthropicJsonRequest<T> {
  maxTokens: number;
  system: string;
  payload: unknown;
  fallback: T;
}

function tryParseJson<T>(value: string): T | null {
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function extractJsonObject<T>(text: string): T | null {
  const direct = tryParseJson<T>(text);

  if (direct) {
    return direct;
  }

  const fencedMatch = text.match(/```json\s*([\s\S]*?)```/i) ?? text.match(/```\s*([\s\S]*?)```/i);
  const fenced = fencedMatch?.[1]?.trim();

  if (fenced) {
    const parsed = tryParseJson<T>(fenced);
    if (parsed) {
      return parsed;
    }
  }

  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");

  if (firstBrace >= 0 && lastBrace > firstBrace) {
    const candidate = text.slice(firstBrace, lastBrace + 1);
    const parsed = tryParseJson<T>(candidate);
    if (parsed) {
      return parsed;
    }
  }

  return null;
}

export async function createAnthropicJsonSummary<T>({
  maxTokens,
  system,
  payload,
  fallback
}: AnthropicJsonRequest<T>) {
  if (!config.anthropicApiKey) {
    return fallback;
  }

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": config.anthropicApiKey,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model: config.anthropicModel || DEFAULT_ANTHROPIC_MODEL,
      max_tokens: maxTokens,
      system,
      messages: [
        {
          role: "user",
          content: JSON.stringify(payload)
        }
      ]
    })
  });

  const body = (await response.json().catch(() => null)) as
    | {
        content?: Array<{
          type?: string;
          text?: string;
        }>;
      }
    | null;

  const text = body?.content?.find(item => item.type === "text")?.text;

  if (!response.ok || !text) {
    return fallback;
  }

  return extractJsonObject<T>(text) ?? fallback;
}
