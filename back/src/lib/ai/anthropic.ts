import { config } from "../../config/env.js";

const DEFAULT_ANTHROPIC_MODEL = "claude-sonnet-4-20250514";

export interface AnthropicUsage {
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  latencyMs: number;
  model: string;
}

export interface AnthropicCallResult<T> {
  data: T;
  usage: AnthropicUsage | null;
}

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

export function computeAnthropicCostUsd(inputTokens: number, outputTokens: number) {
  const inputCost = (inputTokens / 1_000_000) * config.anthropicInputCostPerMtok;
  const outputCost = (outputTokens / 1_000_000) * config.anthropicOutputCostPerMtok;
  return Number((inputCost + outputCost).toFixed(6));
}

export async function createAnthropicJsonSummary<T>({
  maxTokens,
  system,
  payload,
  fallback
}: AnthropicJsonRequest<T>): Promise<AnthropicCallResult<T>> {
  if (!config.anthropicApiKey) {
    return { data: fallback, usage: null };
  }

  const model = config.anthropicModel || DEFAULT_ANTHROPIC_MODEL;
  const startedAt = Date.now();

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": config.anthropicApiKey,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model,
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
        content?: Array<{ type?: string; text?: string }>;
        usage?: {
          input_tokens?: number;
          output_tokens?: number;
          cache_creation_input_tokens?: number;
          cache_read_input_tokens?: number;
        };
      }
    | null;

  const text = body?.content?.find(item => item.type === "text")?.text;
  const latencyMs = Date.now() - startedAt;

  if (!response.ok || !text) {
    return { data: fallback, usage: null };
  }

  const inputTokens =
    (body?.usage?.input_tokens ?? 0) +
    (body?.usage?.cache_creation_input_tokens ?? 0) +
    (body?.usage?.cache_read_input_tokens ?? 0);
  const outputTokens = body?.usage?.output_tokens ?? 0;
  const usage: AnthropicUsage = {
    inputTokens,
    outputTokens,
    costUsd: computeAnthropicCostUsd(inputTokens, outputTokens),
    latencyMs,
    model
  };

  return {
    data: extractJsonObject<T>(text) ?? fallback,
    usage
  };
}
