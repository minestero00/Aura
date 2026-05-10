import { Pool } from "pg";
import { config } from "../../config/env.js";
import { createPgPool } from "../../lib/db/pool.js";

let pool: Pool | null = null;

function getPool() {
  if (!config.databaseUrl) return null;
  if (!pool) pool = createPgPool();
  return pool;
}

export interface DepartureAlertRecord {
  id: string;
  userId: string;
  eventId: string;
  eventStartsAt: Date;
  departureAt: Date;
  alertedAt: Date | null;
  dismissed: boolean;
}

interface DepartureAlertRow {
  id: string;
  user_id: string;
  event_id: string;
  event_starts_at: Date | string;
  departure_at: Date | string;
  alerted_at: Date | string | null;
  dismissed: boolean;
}

interface UserLocationRow {
  user_id: string;
  lat: number;
  lng: number;
  accuracy_meters: number | null;
  reported_at: Date | string;
}

function toDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

function mapRow(row: DepartureAlertRow): DepartureAlertRecord {
  return {
    id: row.id,
    userId: row.user_id,
    eventId: row.event_id,
    eventStartsAt: toDate(row.event_starts_at),
    departureAt: toDate(row.departure_at),
    alertedAt: row.alerted_at ? toDate(row.alerted_at) : null,
    dismissed: row.dismissed
  };
}

export const departureRepository = {
  async getUserLocation(userId: string) {
    const db = getPool();
    if (!db) return null;
    const result = await db.query<UserLocationRow>(
      "SELECT user_id, lat, lng, accuracy_meters, reported_at FROM aura.user_locations WHERE user_id = $1",
      [userId]
    );
    const row = result.rows[0];
    if (!row) return null;
    return {
      lat: row.lat,
      lng: row.lng,
      accuracyMeters: row.accuracy_meters,
      reportedAt: toDate(row.reported_at)
    };
  },
  async upsertUserLocation(userId: string, lat: number, lng: number, accuracyMeters: number | null) {
    const db = getPool();
    if (!db) return;
    await db.query(
      `INSERT INTO aura.user_locations (user_id, lat, lng, accuracy_meters, reported_at)
       VALUES ($1, $2, $3, $4, now())
       ON CONFLICT (user_id) DO UPDATE
         SET lat = EXCLUDED.lat,
             lng = EXCLUDED.lng,
             accuracy_meters = EXCLUDED.accuracy_meters,
             reported_at = now()`,
      [userId, lat, lng, accuracyMeters]
    );
  },
  async getAlertByEvent(userId: string, eventId: string): Promise<DepartureAlertRecord | null> {
    const db = getPool();
    if (!db) return null;
    const result = await db.query<DepartureAlertRow>(
      "SELECT id, user_id, event_id, event_starts_at, departure_at, alerted_at, dismissed FROM aura.departure_alerts WHERE user_id = $1 AND event_id = $2",
      [userId, eventId]
    );
    const row = result.rows[0];
    return row ? mapRow(row) : null;
  },
  async getAlert(id: string): Promise<DepartureAlertRecord | null> {
    const db = getPool();
    if (!db) return null;
    const result = await db.query<DepartureAlertRow>(
      "SELECT id, user_id, event_id, event_starts_at, departure_at, alerted_at, dismissed FROM aura.departure_alerts WHERE id = $1",
      [id]
    );
    const row = result.rows[0];
    return row ? mapRow(row) : null;
  },
  async upsertAlert(input: {
    id: string;
    userId: string;
    eventId: string;
    eventStartsAt: Date;
    departureAt: Date;
  }): Promise<DepartureAlertRecord> {
    const db = getPool();
    if (!db) {
      throw new Error("Database not configured");
    }
    const result = await db.query<DepartureAlertRow>(
      `INSERT INTO aura.departure_alerts (id, user_id, event_id, event_starts_at, departure_at, alerted_at, dismissed, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NULL, false, now(), now())
       ON CONFLICT (user_id, event_id) DO UPDATE
         SET event_starts_at = EXCLUDED.event_starts_at,
             departure_at = EXCLUDED.departure_at,
             updated_at = now()
       RETURNING id, user_id, event_id, event_starts_at, departure_at, alerted_at, dismissed`,
      [input.id, input.userId, input.eventId, input.eventStartsAt, input.departureAt]
    );
    return mapRow(result.rows[0]!);
  },
  async markAlerted(id: string) {
    const db = getPool();
    if (!db) return;
    await db.query(
      "UPDATE aura.departure_alerts SET alerted_at = now(), updated_at = now() WHERE id = $1",
      [id]
    );
  },
  async markDismissed(userId: string, eventId: string) {
    const db = getPool();
    if (!db) return;
    await db.query(
      "UPDATE aura.departure_alerts SET dismissed = true, updated_at = now() WHERE user_id = $1 AND event_id = $2",
      [userId, eventId]
    );
  },
  async cleanupOldAlerts() {
    const db = getPool();
    if (!db) return 0;
    // 이벤트 시작 1시간 지난 row 삭제 — 다시 알림 보낼 일 없음.
    const result = await db.query(
      "DELETE FROM aura.departure_alerts WHERE event_starts_at < now() - interval '1 hour'"
    );
    return result.rowCount ?? 0;
  }
};
