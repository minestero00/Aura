import SQLite from "react-native-sqlite-storage";
import type { ChatCitation, ChatMessage, ChatRole } from "@features/chat/types";

SQLite.enablePromise(true);

let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;

function parseCitations(raw: string): ChatCitation[] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter(item => typeof item === "object" && item !== null)
      .map(item => {
        const citation = item as { type?: string; title?: string; url?: string };
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
        } satisfies ChatCitation;
      })
      .filter(Boolean) as ChatCitation[];
  } catch {
    return [];
  }
}

async function getDatabase() {
  if (!databasePromise) {
    databasePromise = SQLite.openDatabase({
      name: "aura_chat.db",
      location: "default"
    }).then(async (db: SQLite.SQLiteDatabase) => {
      await db.executeSql(
        `CREATE TABLE IF NOT EXISTS chat_messages_local (
          message_id TEXT PRIMARY KEY NOT NULL,
          user_id TEXT NOT NULL,
          session_id TEXT NOT NULL,
          role TEXT NOT NULL,
          content TEXT NOT NULL,
          citations_json TEXT NOT NULL DEFAULT '[]',
          created_at TEXT NOT NULL
        )`
      );
      await db.executeSql(
        "CREATE INDEX IF NOT EXISTS chat_messages_local_user_created_idx ON chat_messages_local (user_id, created_at)"
      );
      return db;
    });
  }

  return databasePromise;
}

export async function loadChatMessagesFromSqlite(userId: string, limit = 120) {
  const db = await getDatabase();
  const [result] = await db.executeSql(
    `SELECT message_id, session_id, role, content, citations_json, created_at
       FROM chat_messages_local
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT ?`,
    [userId, limit]
  );

  const items: ChatMessage[] = [];

  for (let index = 0; index < result.rows.length; index += 1) {
    const row = result.rows.item(index) as {
      message_id: string;
      session_id: string;
      role: ChatRole;
      content: string;
      citations_json: string;
      created_at: string;
    };
    items.push({
      id: row.message_id,
      userId,
      sessionId: row.session_id,
      role: row.role,
      content: row.content,
      citations: parseCitations(row.citations_json),
      createdAt: row.created_at
    });
  }

  return items.reverse();
}

export async function saveChatMessagesToSqlite(userId: string, messages: ChatMessage[]) {
  if (messages.length === 0) {
    return;
  }

  const db = await getDatabase();

  for (const message of messages) {
    await db.executeSql(
      `INSERT OR REPLACE INTO chat_messages_local
        (message_id, user_id, session_id, role, content, citations_json, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        message.id,
        userId,
        message.sessionId,
        message.role,
        message.content,
        JSON.stringify(message.citations ?? []),
        message.createdAt
      ]
    );
  }
}
