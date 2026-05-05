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

interface StreamRequest {
  maxTokens: number;
  system: string;
  userMessage: string;
}

export interface AnthropicStreamEvents {
  onTextDelta: (delta: string) => void;
  onComplete?: (usage: AnthropicUsage | null) => void;
  onError?: (error: Error) => void;
}

export async function streamAnthropicText(
  request: StreamRequest,
  events: AnthropicStreamEvents
): Promise<{ fullText: string; usage: AnthropicUsage | null }> {
  if (!config.anthropicApiKey) {
    events.onError?.(new Error("ANTHROPIC_NOT_CONFIGURED"));
    events.onComplete?.(null);
    return { fullText: "", usage: null };
  }

  const model = config.anthropicModel || DEFAULT_ANTHROPIC_MODEL;
  const startedAt = Date.now();

  let fullText = "";
  let inputTokens = 0;
  let outputTokens = 0;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": config.anthropicApiKey,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model,
      max_tokens: request.maxTokens,
      stream: true,
      system: request.system,
      messages: [{ role: "user", content: request.userMessage }]
    })
  });

  if (!response.ok || !response.body) {
    const detail = await response.text().catch(() => "");
    const error = new Error(`Anthropic stream HTTP ${response.status}: ${detail}`);
    events.onError?.(error);
    events.onComplete?.(null);
    return { fullText: "", usage: null };
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const dataPart = trimmed.slice(5).trim();
      if (!dataPart || dataPart === "[DONE]") continue;
      try {
        const event = JSON.parse(dataPart) as {
          type?: string;
          delta?: { type?: string; text?: string };
          message?: { usage?: { input_tokens?: number; output_tokens?: number } };
          usage?: { output_tokens?: number };
        };
        if (event.type === "content_block_delta" && event.delta?.type === "text_delta" && event.delta.text) {
          fullText += event.delta.text;
          events.onTextDelta(event.delta.text);
        } else if (event.type === "message_start" && event.message?.usage) {
          inputTokens = event.message.usage.input_tokens ?? 0;
          outputTokens = event.message.usage.output_tokens ?? 0;
        } else if (event.type === "message_delta" && event.usage?.output_tokens) {
          outputTokens = event.usage.output_tokens;
        }
      } catch {
        // ignore malformed event lines
      }
    }
  }

  const latencyMs = Date.now() - startedAt;
  const usage: AnthropicUsage = {
    inputTokens,
    outputTokens,
    costUsd: computeAnthropicCostUsd(inputTokens, outputTokens),
    latencyMs,
    model
  };

  events.onComplete?.(usage);
  return { fullText, usage };
}
