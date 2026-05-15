import type { Pool } from "pg";
import { createPgPool } from "../../lib/db/pool.js";

let pool: Pool | null = null;
function getPool() {
  if (!pool) pool = createPgPool();
  return pool;
}

export interface MeetingBriefAlert {
  id: string;
  userId: string;
  eventId: string;
  eventTitle: string;
  eventStartsAt: Date;
  alertedAt: Date | null;
}

export async function getAlertByEvent(
  userId: string,
  eventId: string
): Promise<MeetingBriefAlert | null> {
  const db = getPool();
  if (!db) return null;
  const result = await db.query(
    `SELECT id, user_id, event_id, event_title, event_starts_at, alerted_at
     FROM aura.meeting_brief_alerts
     WHERE user_id = $1 AND event_id = $2`,
    [userId, eventId]
  );
  const row = result.rows[0];
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    eventId: row.event_id,
    eventTitle: row.event_title,
    eventStartsAt: new Date(row.event_starts_at),
    alertedAt: row.alerted_at ? new Date(row.alerted_at) : null
  };
}

export async function upsertAlert(input: {
  id: string;
  userId: string;
  eventId: string;
  eventTitle: string;
  eventStartsAt: Date;
}): Promise<void> {
  const db = getPool();
  if (!db) return;
  await db.query(
    `INSERT INTO aura.meeting_brief_alerts (id, user_id, event_id, event_title, event_starts_at)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (user_id, event_id) DO NOTHING`,
    [input.id, input.userId, input.eventId, input.eventTitle, input.eventStartsAt]
  );
}

export async function markAlerted(userId: string, eventId: string): Promise<void> {
  const db = getPool();
  if (!db) return;
  await db.query(
    `UPDATE aura.meeting_brief_alerts
     SET alerted_at = now()
     WHERE user_id = $1 AND event_id = $2`,
    [userId, eventId]
  );
}

/** 7일 이상 지난 회의 브리핑 레코드 정리. */
export async function cleanupOldAlerts(): Promise<number> {
  const db = getPool();
  if (!db) return 0;
  const result = await db.query(
    `DELETE FROM aura.meeting_brief_alerts
     WHERE event_starts_at < now() - INTERVAL '7 days'`
  );
  return result.rowCount ?? 0;
}
