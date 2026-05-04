import { Pool } from "pg";
import { config } from "../../config/env.js";
import { createPgPool } from "../../lib/db/pool.js";
import { AppError } from "../../lib/errors/app-error.js";
import { createId } from "../../lib/ids.js";
import type { ChatCitation, ChatMessage, ChatRole } from "./types.js";

let pool: Pool | null = null;

interface MemorySession {
  id: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

const memorySessionsById = new Map<string, MemorySession>();
const memoryMessagesBySessionId = new Map<string, ChatMessage[]>();

function getPool() {
  if (!config.databaseUrl) {
    return null;
  }

  if (!pool) {
    pool = createPgPool();
  }

  return pool;
}

function parseCitations(raw: string | null | undefined) {
  if (!raw) {
    return [] as ChatCitation[];
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter(item => typeof item === "object" && item !== null)
      .map(item => {
        const citation = item as {
          type?: string;
          title?: string;
          url?: string;
        };

        if (
          (citation.type !== "news" && citation.type !== "mail" && citation.type !== "briefing") ||
          !citation.title
        ) {
          return null;
        }

        return {
          type: citation.type,
          title: citation.title,
          url: citation.url
        } as ChatCitation;
      })
      .filter(Boolean) as ChatCitation[];
  } catch {
    return [];
  }
}

function ensureOwnedMemorySession(userId: string, sessionId: string) {
  const existing = memorySessionsById.get(sessionId);

  if (!existing || existing.userId !== userId) {
    throw new AppError(404, "CHAT_SESSION_NOT_FOUND", "Chat session could not be found.");
  }

  return existing;
}

export const chatRepository = {
  async ensureSession(userId: string, sessionId?: string) {
    const poolInstance = getPool();

    if (!poolInstance) {
      if (sessionId) {
        return ensureOwnedMemorySession(userId, sessionId).id;
      }

      const id = createId();
      const now = new Date().toISOString();
      memorySessionsById.set(id, {
        id,
        userId,
        createdAt: now,
        updatedAt: now
      });
      return id;
    }

    if (sessionId) {
      const existing = await poolInstance.query<{ id: string }>(
        "SELECT id FROM aura.chat_sessions WHERE id = $1 AND user_id = $2",
        [sessionId, userId]
      );

      if (!existing.rowCount) {
        throw new AppError(404, "CHAT_SESSION_NOT_FOUND", "Chat session could not be found.");
      }

      return sessionId;
    }

    const id = createId();
    await poolInstance.query(
      "INSERT INTO aura.chat_sessions (id, user_id, created_at, updated_at) VALUES ($1, $2, now(), now())",
      [id, userId]
    );
    return id;
  },

  async addMessage(
    userId: string,
    sessionId: string,
    role: ChatRole,
    content: string,
    citations: ChatCitation[]
  ) {
    const poolInstance = getPool();

    if (!poolInstance) {
      ensureOwnedMemorySession(userId, sessionId);
      const now = new Date().toISOString();
      const message: ChatMessage = {
        id: createId(),
        sessionId,
        userId,
        role,
        content,
        citations,
        createdAt: now
      };
      const existing = memoryMessagesBySessionId.get(sessionId) ?? [];
      memoryMessagesBySessionId.set(sessionId, [...existing, message]);
      return message;
    }

    const result = await poolInstance.query<{
      id: string;
      session_id: string;
      user_id: string;
      role: ChatRole;
      content: string;
      citations: string;
      created_at: Date;
    }>(
      `INSERT INTO aura.chat_messages (id, session_id, user_id, role, content, citations, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, now())
       RETURNING id, session_id, user_id, role, content, citations, created_at`,
      [createId(), sessionId, userId, role, content, JSON.stringify(citations)]
    );

    await poolInstance.query(
      `UPDATE aura.chat_sessions
          SET last_user_message_at = CASE WHEN $2 = 'user' THEN now() ELSE last_user_message_at END,
              last_assistant_message_at = CASE WHEN $2 = 'assistant' THEN now() ELSE last_assistant_message_at END,
              updated_at = now()
        WHERE id = $1`,
      [sessionId, role]
    );

    const row = result.rows[0];
    return {
      id: row.id,
      sessionId: row.session_id,
      userId: row.user_id,
      role: row.role,
      content: row.content,
      citations: parseCitations(row.citations),
      createdAt: row.created_at.toISOString()
    } satisfies ChatMessage;
  },

  async listRecentMessages(userId: string, sessionId: string, limit = 8) {
    const poolInstance = getPool();

    if (!poolInstance) {
      ensureOwnedMemorySession(userId, sessionId);
      const messages = memoryMessagesBySessionId.get(sessionId) ?? [];
      return messages.slice(Math.max(0, messages.length - limit));
    }

    const result = await poolInstance.query<{
      id: string;
      session_id: string;
      user_id: string;
      role: ChatRole;
      content: string;
      citations: string;
      created_at: Date;
    }>(
      `SELECT id, session_id, user_id, role, content, citations, created_at
         FROM aura.chat_messages
        WHERE session_id = $1
          AND user_id = $2
        ORDER BY created_at DESC
        LIMIT $3`,
      [sessionId, userId, limit]
    );

    return result.rows
      .reverse()
      .map(row => ({
        id: row.id,
        sessionId: row.session_id,
        userId: row.user_id,
        role: row.role,
        content: row.content,
        citations: parseCitations(row.citations),
        createdAt: row.created_at.toISOString()
      }) satisfies ChatMessage);
  }
};
