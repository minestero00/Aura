import { Pool } from "pg";
import { config } from "../../config/env.js";
import { createPgPool } from "../../lib/db/pool.js";
import { AppError } from "../../lib/errors/app-error.js";
import { createId } from "../../lib/ids.js";
import { pushService } from "../push/service.js";
import { transitApi } from "./transit-api.js";
import type {
  TransitMode,
  TransitPingResult,
  TransitTrip,
  TransitTripRow,
  TransitTripStatus
} from "./types.js";

const MAX_ACTIVE_TRIPS_PER_USER = 1;
const TRIP_MAX_DURATION_MS = 3 * 60 * 60 * 1000;
const TRIP_AUTO_COMPLETE_RADIUS_METERS = 80;

let pool: Pool | null = null;

function getPool() {
  if (!config.databaseUrl) {
    return null;
  }
  if (!pool) {
    pool = createPgPool();
  }
  return pool;
}

function toIsoString(value: string | Date | null): string {
  if (!value) return new Date().toISOString();
  if (value instanceof Date) return value.toISOString();
  return value;
}

function mapRow(row: TransitTripRow): TransitTrip {
  return {
    id: row.id,
    mode: row.mode,
    routeId: row.route_id,
    routeName: row.route_name,
    direction: row.direction,
    originStopName: row.origin_stop_name,
    destinationStopName: row.destination_stop_name,
    destinationLat: Number(row.destination_lat),
    destinationLng: Number(row.destination_lng),
    status: row.status,
    alertThresholdStops: row.alert_threshold_stops,
    alertSentAt: row.alert_sent_at ? toIsoString(row.alert_sent_at) : null,
    lastRemainingStops: row.last_remaining_stops,
    lastEtaSeconds: row.last_eta_seconds,
    lastPingedAt: row.last_pinged_at ? toIsoString(row.last_pinged_at) : null,
    startedAt: toIsoString(row.started_at),
    endedAt: row.ended_at ? toIsoString(row.ended_at) : null
  };
}

function logTransitEvent(message: string, details: Record<string, unknown>) {
  console.log(
    JSON.stringify({
      level: "info",
      service: "aura-back",
      module: "transit",
      message,
      ...details
    })
  );
}

async function findActiveTrip(db: Pool, userId: string) {
  const result = await db.query<TransitTripRow>(
    "SELECT * FROM aura.transit_trips WHERE user_id = $1 AND status = 'active' ORDER BY started_at DESC LIMIT 1",
    [userId]
  );
  return result.rows[0] ?? null;
}

interface StartTripInput {
  userId: string;
  mode: TransitMode;
  routeId?: string;
  routeName: string;
  direction?: string;
  originStopId?: string;
  originStopName?: string;
  destinationStopId?: string;
  destinationStopName: string;
  destinationLat: number;
  destinationLng: number;
  alertThresholdStops?: number;
}

export const transitService = {
  async startTrip(input: StartTripInput): Promise<TransitTrip> {
    const db = getPool();
    if (!db) {
      throw new AppError(503, "TRANSIT_NOT_CONFIGURED", "Transit service requires a database.");
    }

    const existing = await findActiveTrip(db, input.userId);
    if (existing) {
      throw new AppError(409, "TRANSIT_TRIP_ALREADY_ACTIVE", "An active trip already exists.", {
        tripId: existing.id
      });
    }

    const id = createId();
    const result = await db.query<TransitTripRow>(
      `INSERT INTO aura.transit_trips
        (id, user_id, mode, route_id, route_name, direction,
         origin_stop_id, origin_stop_name, destination_stop_id, destination_stop_name,
         destination_lat, destination_lng, status, alert_threshold_stops,
         started_at, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'active',$13, now(), now(), now())
       RETURNING *`,
      [
        id,
        input.userId,
        input.mode,
        input.routeId ?? null,
        input.routeName,
        input.direction ?? null,
        input.originStopId ?? null,
        input.originStopName ?? null,
        input.destinationStopId ?? null,
        input.destinationStopName,
        input.destinationLat.toFixed(6),
        input.destinationLng.toFixed(6),
        input.alertThresholdStops ?? 1
      ]
    );

    logTransitEvent("trip started", {
      tripId: id,
      userId: input.userId,
      mode: input.mode,
      routeName: input.routeName
    });

    return mapRow(result.rows[0]!);
  },

  async ping(userId: string, tripId: string, location: { lat: number; lng: number }): Promise<TransitPingResult> {
    const db = getPool();
    if (!db) {
      throw new AppError(503, "TRANSIT_NOT_CONFIGURED", "Transit service requires a database.");
    }

    const tripResult = await db.query<TransitTripRow>(
      "SELECT * FROM aura.transit_trips WHERE id = $1 AND user_id = $2 LIMIT 1",
      [tripId, userId]
    );
    const tripRow = tripResult.rows[0];
    if (!tripRow) {
      throw new AppError(404, "TRANSIT_TRIP_NOT_FOUND", "Trip not found.");
    }

    if (tripRow.status !== "active") {
      throw new AppError(409, "TRANSIT_TRIP_NOT_ACTIVE", "Trip is not active.", {
        status: tripRow.status
      });
    }

    const startedAtMs = new Date(toIsoString(tripRow.started_at)).getTime();
    if (Date.now() - startedAtMs > TRIP_MAX_DURATION_MS) {
      await db.query(
        "UPDATE aura.transit_trips SET status = 'expired', ended_at = now(), updated_at = now() WHERE id = $1",
        [tripId]
      );
      throw new AppError(410, "TRANSIT_TRIP_EXPIRED", "Trip has expired.");
    }

    const destination = {
      lat: Number(tripRow.destination_lat),
      lng: Number(tripRow.destination_lng)
    };
    const eta = await transitApi.getRouteEta({
      mode: tripRow.mode,
      routeId: tripRow.route_id,
      routeName: tripRow.route_name,
      origin: location,
      destination
    });

    let alertSent = false;
    let nextStatus: TransitTripStatus = "active";
    let endedAt: string | null = null;

    if (eta.distanceMeters <= TRIP_AUTO_COMPLETE_RADIUS_METERS) {
      nextStatus = "arrived";
      endedAt = new Date().toISOString();
    }

    const shouldAlert =
      nextStatus === "active" &&
      eta.remainingStops <= tripRow.alert_threshold_stops &&
      !tripRow.alert_sent_at;

    if (shouldAlert) {
      try {
        await pushService.sendToUser(userId, {
          title: "곧 도착",
          body: `${tripRow.route_name} · ${tripRow.destination_stop_name}까지 ${eta.remainingStops}정거장 남았습니다.`,
          category: "bus_arrival_warning",
          critical: true,
          data: {
            type: "transit_arrival_warning",
            tripId,
            remainingStops: eta.remainingStops,
            etaSeconds: eta.etaSeconds
          }
        });
        alertSent = true;
      } catch (error) {
        logTransitEvent("push send failed", {
          tripId,
          userId,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    const updated = await db.query<TransitTripRow>(
      `UPDATE aura.transit_trips
         SET last_lat = $2,
             last_lng = $3,
             last_remaining_stops = $4,
             last_eta_seconds = $5,
             last_pinged_at = now(),
             alert_sent_at = COALESCE(alert_sent_at, $6),
             status = $7,
             ended_at = COALESCE(ended_at, $8),
             updated_at = now()
         WHERE id = $1
         RETURNING *`,
      [
        tripId,
        location.lat.toFixed(6),
        location.lng.toFixed(6),
        eta.remainingStops,
        eta.etaSeconds,
        alertSent ? new Date().toISOString() : null,
        nextStatus,
        endedAt
      ]
    );

    return {
      trip: mapRow(updated.rows[0]!),
      remainingStops: eta.remainingStops,
      etaSeconds: eta.etaSeconds,
      distanceMeters: eta.distanceMeters,
      alertSent
    };
  },

  async endTrip(userId: string, tripId: string, reason: "cancelled" | "arrived"): Promise<TransitTrip> {
    const db = getPool();
    if (!db) {
      throw new AppError(503, "TRANSIT_NOT_CONFIGURED", "Transit service requires a database.");
    }

    const result = await db.query<TransitTripRow>(
      `UPDATE aura.transit_trips
         SET status = $3, ended_at = COALESCE(ended_at, now()), updated_at = now()
         WHERE id = $1 AND user_id = $2 AND status = 'active'
         RETURNING *`,
      [tripId, userId, reason]
    );
    const row = result.rows[0];
    if (!row) {
      throw new AppError(404, "TRANSIT_TRIP_NOT_FOUND", "Active trip not found.");
    }
    return mapRow(row);
  },

  async getActiveTrip(userId: string): Promise<TransitTrip | null> {
    const db = getPool();
    if (!db) {
      return null;
    }
    const row = await findActiveTrip(db, userId);
    return row ? mapRow(row) : null;
  },

  async listRecentTrips(userId: string, limit = 20): Promise<TransitTrip[]> {
    const db = getPool();
    if (!db) {
      return [];
    }
    const result = await db.query<TransitTripRow>(
      "SELECT * FROM aura.transit_trips WHERE user_id = $1 ORDER BY started_at DESC LIMIT $2",
      [userId, Math.max(1, Math.min(50, limit))]
    );
    return result.rows.map(mapRow);
  },

  async close() {
    if (pool) {
      await pool.end();
      pool = null;
    }
  }
};

export const transitInternals = {
  TRIP_AUTO_COMPLETE_RADIUS_METERS,
  MAX_ACTIVE_TRIPS_PER_USER
};
