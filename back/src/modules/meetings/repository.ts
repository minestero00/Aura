import type { Pool } from "pg";
import { createPgPool } from "../../lib/db/pool.js";
import { createId } from "../../lib/ids.js";

let pool: Pool | null = null;
function getPool() {
  if (!pool) pool = createPgPool();
  return pool;
}

export type MeetingStatus = "draft" | "done";

export interface MeetingNote {
  id: string;
  userId: string;
  title: string;
  body: string;
  rawTranscript: string | null;
  templateId: string | null;
  status: MeetingStatus;
  shareToken: string | null;
  eventId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface MeetingRow {
  id: string;
  user_id: string;
  title: string;
  body: string;
  raw_transcript: string | null;
  template_id: string | null;
  status: MeetingStatus;
  share_token: string | null;
  event_id: string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

function rowToNote(row: MeetingRow): MeetingNote {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    body: row.body,
    rawTranscript: row.raw_transcript,
    templateId: row.template_id,
    status: row.status,
    shareToken: row.share_token,
    eventId: row.event_id,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at)
  };
}

const SELECT_FIELDS = `
  id, user_id, title, body, raw_transcript, template_id,
  status, share_token, event_id, created_at, updated_at
`;

export async function listMeetingNotes(
  userId: string,
  limit = 20,
  offset = 0
): Promise<MeetingNote[]> {
  const db = getPool();
  const result = await db.query<MeetingRow>(
    `SELECT ${SELECT_FIELDS} FROM aura.meeting_notes
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT $2 OFFSET $3`,
    [userId, limit, offset]
  );
  return result.rows.map(rowToNote);
}

export async function getMeetingNoteById(
  id: string,
  userId: string
): Promise<MeetingNote | null> {
  const db = getPool();
  const result = await db.query<MeetingRow>(
    `SELECT ${SELECT_FIELDS} FROM aura.meeting_notes WHERE id = $1 AND user_id = $2`,
    [id, userId]
  );
  const row = result.rows[0];
  return row ? rowToNote(row) : null;
}

export async function getMeetingNoteByShareToken(
  token: string
): Promise<MeetingNote | null> {
  const db = getPool();
  const result = await db.query<MeetingRow>(
    `SELECT ${SELECT_FIELDS} FROM aura.meeting_notes WHERE share_token = $1`,
    [token]
  );
  const row = result.rows[0];
  return row ? rowToNote(row) : null;
}

export async function createMeetingNote(input: {
  userId: string;
  title: string;
  body: string;
  rawTranscript?: string | null;
  templateId?: string | null;
  eventId?: string | null;
}): Promise<MeetingNote> {
  const db = getPool();
  const id = createId();

  await db.query(
    `INSERT INTO aura.meeting_notes
       (id, user_id, title, body, raw_transcript, template_id, event_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      id,
      input.userId,
      input.title,
      input.body,
      input.rawTranscript ?? null,
      input.templateId ?? null,
      input.eventId ?? null
    ]
  );

  return (await getMeetingNoteById(id, input.userId))!;
}

export async function updateMeetingNote(
  id: string,
  userId: string,
  patch: {
    title?: string;
    body?: string;
    rawTranscript?: string | null;
    status?: MeetingStatus;
  }
): Promise<MeetingNote | null> {
  const db = getPool();

  const sets: string[] = ["updated_at = now()"];
  const params: unknown[] = [id, userId];
  let i = 3;

  if (patch.title !== undefined) { sets.push(`title = $${i++}`); params.push(patch.title); }
  if (patch.body !== undefined) { sets.push(`body = $${i++}`); params.push(patch.body); }
  if (patch.rawTranscript !== undefined) { sets.push(`raw_transcript = $${i++}`); params.push(patch.rawTranscript); }
  if (patch.status !== undefined) { sets.push(`status = $${i++}`); params.push(patch.status); }

  await db.query(
    `UPDATE aura.meeting_notes SET ${sets.join(", ")}
     WHERE id = $1 AND user_id = $2`,
    params
  );

  return getMeetingNoteById(id, userId);
}

export async function setShareToken(
  id: string,
  userId: string,
  token: string | null
): Promise<void> {
  const db = getPool();
  await db.query(
    `UPDATE aura.meeting_notes SET share_token = $3, updated_at = now()
     WHERE id = $1 AND user_id = $2`,
    [id, userId, token]
  );
}

export async function deleteMeetingNote(
  id: string,
  userId: string
): Promise<void> {
  const db = getPool();
  await db.query(
    "DELETE FROM aura.meeting_notes WHERE id = $1 AND user_id = $2",
    [id, userId]
  );
}
