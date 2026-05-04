import { Pool } from "pg";
import { config } from "../../config/env.js";
import { createPgPool } from "../../lib/db/pool.js";
import { createId } from "../../lib/ids.js";
import { briefingsService } from "../briefings/service.js";

type JobType = "daily_brief_precompute";
type JobStatus = "queued" | "processing" | "completed" | "failed" | "dead_letter";

interface BackgroundJobRow {
  id: string;
  job_type: JobType;
  user_id: string | null;
  job_key: string | null;
  status: JobStatus;
  attempt_count: number;
  max_attempts: number;
  available_at: Date | string;
  started_at: Date | string | null;
  completed_at: Date | string | null;
  error_code: string | null;
  error_message: string | null;
  payload: string | null;
}

interface DailyBriefPrecomputePayload {
  userId: string;
}

const POLL_INTERVAL_MS = 3_000;
const RETENTION_CLEANUP_INTERVAL_MS = 60 * 60 * 1000;
const COMPLETED_RETENTION_DAYS = 7;
const FAILED_RETENTION_DAYS = 30;

let pool: Pool | null = null;
let pollingTimer: NodeJS.Timeout | null = null;
let cleanupTimer: NodeJS.Timeout | null = null;
let active = false;
let pollingInFlight = false;

function getPool() {
  if (!config.databaseUrl) {
    return null;
  }

  if (!pool) {
    pool = createPgPool();
  }

  return pool;
}

function logInfo(message: string, details?: Record<string, unknown>) {
  console.log(
    JSON.stringify({
      level: "info",
      service: "aura-worker",
      module: "jobs",
      message,
      ...(details ?? {})
    })
  );
}

function logWarn(message: string, details?: Record<string, unknown>) {
  console.log(
    JSON.stringify({
      level: "warn",
      service: "aura-worker",
      module: "jobs",
      message,
      ...(details ?? {})
    })
  );
}

function toErrorLog(error: unknown) {
  if (error instanceof Error) {
    const withCode = error as Error & { code?: string };
    return {
      name: error.name,
      message: error.message || error.toString(),
      code: withCode.code ?? null
    };
  }

  return {
    name: "UnknownError",
    message: String(error),
    code: null
  };
}

function toDate(value: Date | string | null) {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return value;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
}

function getBackoffDelayMs(attemptCount: number) {
  const seconds = Math.min(60 * 30, 5 * 2 ** Math.max(0, attemptCount - 1));
  return seconds * 1000;
}

async function enqueueDailyBriefPrecompute(userId: string, source: "schedule" | "manual") {
  const db = getPool();
  if (!db) {
    return;
  }

  const jobType: JobType = "daily_brief_precompute";
  const dayKey = new Date().toISOString().slice(0, 10);
  const jobKey = `${userId}:${dayKey}:${source}`;
  const payload: DailyBriefPrecomputePayload = {
    userId
  };

  await db.query(
    "INSERT INTO aura.background_jobs (id, job_type, user_id, job_key, status, attempt_count, max_attempts, available_at, payload, created_at, updated_at) VALUES ($1, $2, $3, $4, 'queued', 0, 5, now(), $5, now(), now()) ON CONFLICT (job_type, job_key) WHERE job_key IS NOT NULL DO NOTHING",
    [createId(), jobType, userId, jobKey, JSON.stringify(payload)]
  );
}

async function claimNextJob() {
  const db = getPool();
  if (!db) {
    return null;
  }

  const result = await db.query<BackgroundJobRow>(
    `
    WITH next_job AS (
      SELECT id
      FROM aura.background_jobs
      WHERE status IN ('queued', 'failed')
        AND available_at <= now()
      ORDER BY available_at ASC
      FOR UPDATE SKIP LOCKED
      LIMIT 1
    )
    UPDATE aura.background_jobs
    SET status = 'processing',
        started_at = now(),
        attempt_count = attempt_count + 1,
        updated_at = now()
    WHERE id IN (SELECT id FROM next_job)
    RETURNING *;
    `
  );

  return result.rows[0] ?? null;
}

async function markCompleted(jobId: string) {
  const db = getPool();
  if (!db) {
    return;
  }

  await db.query(
    "UPDATE aura.background_jobs SET status = 'completed', completed_at = now(), error_code = NULL, error_message = NULL, updated_at = now() WHERE id = $1",
    [jobId]
  );
}

async function markFailed(job: BackgroundJobRow, error: unknown) {
  const db = getPool();
  if (!db) {
    return;
  }

  const nextAttempt = job.attempt_count;
  const exhausted = nextAttempt >= job.max_attempts;
  const delayMs = getBackoffDelayMs(nextAttempt);
  const availableAt = new Date(Date.now() + delayMs);
  const errorMessage = error instanceof Error ? error.message : String(error);

  if (exhausted) {
    await db.query(
      "UPDATE aura.background_jobs SET status = 'dead_letter', error_code = $2, error_message = $3, completed_at = now(), updated_at = now() WHERE id = $1",
      [job.id, "MAX_ATTEMPTS_EXCEEDED", errorMessage]
    );
    return;
  }

  await db.query(
    "UPDATE aura.background_jobs SET status = 'failed', error_code = $2, error_message = $3, available_at = $4, updated_at = now() WHERE id = $1",
    [job.id, "JOB_PROCESSING_FAILED", errorMessage, availableAt]
  );
}

async function processJob(job: BackgroundJobRow) {
  if (job.job_type === "daily_brief_precompute") {
    const payloadRaw = job.payload ? JSON.parse(job.payload) : null;
    const payload = payloadRaw as DailyBriefPrecomputePayload | null;

    if (!payload?.userId) {
      throw new Error("Missing daily brief payload userId");
    }

    await briefingsService.precomputeDailyBrief(payload.userId);
    return;
  }

  throw new Error(`Unsupported job type: ${job.job_type}`);
}

async function pollOnce() {
  if (pollingInFlight) {
    return;
  }

  pollingInFlight = true;

  try {
    try {
      while (active) {
        const job = await claimNextJob();
        if (!job) {
          break;
        }

        try {
          await processJob(job);
          await markCompleted(job.id);
        } catch (error) {
          await markFailed(job, error);
          logWarn("job processing failed", {
            jobId: job.id,
            jobType: job.job_type,
            attemptCount: job.attempt_count,
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }
    } catch (error) {
      logWarn("job polling cycle failed", {
        error: toErrorLog(error)
      });
    }
  } finally {
    pollingInFlight = false;
  }
}

async function cleanupOldJobs() {
  const db = getPool();
  if (!db) {
    return;
  }

  const completedThreshold = new Date(Date.now() - COMPLETED_RETENTION_DAYS * 24 * 60 * 60 * 1000);
  const failedThreshold = new Date(Date.now() - FAILED_RETENTION_DAYS * 24 * 60 * 60 * 1000);

  try {
    const deleted = await db.query<{ count: string }>(
      `
        WITH removed AS (
          DELETE FROM aura.background_jobs
          WHERE (status = 'completed' AND completed_at IS NOT NULL AND completed_at < $1)
            OR (status IN ('failed', 'dead_letter') AND updated_at < $2)
          RETURNING id
        )
        SELECT count(*)::text AS count FROM removed;
      `,
      [completedThreshold, failedThreshold]
    );

    const count = Number(deleted.rows[0]?.count ?? "0");
    if (count > 0) {
      logInfo("old jobs cleaned up", {
        removed: count
      });
    }
  } catch (error) {
    logWarn("job cleanup cycle failed", {
      error: toErrorLog(error)
    });
  }
}

export const jobsService = {
  async enqueueDailyBriefPrecompute(userId: string, source: "schedule" | "manual" = "manual") {
    await enqueueDailyBriefPrecompute(userId, source);
  },
  startWorker() {
    if (active) {
      return;
    }

    const db = getPool();
    if (!db) {
      logWarn("jobs worker disabled: DATABASE_URL is not configured");
      return;
    }

    active = true;
    pollingTimer = setInterval(() => {
      void pollOnce();
    }, POLL_INTERVAL_MS);
    cleanupTimer = setInterval(() => {
      void cleanupOldJobs();
    }, RETENTION_CLEANUP_INTERVAL_MS);

    void pollOnce();
    void cleanupOldJobs();

    logInfo("jobs worker started", {
      pollIntervalMs: POLL_INTERVAL_MS
    });
  },
  stopWorker() {
    active = false;

    if (pollingTimer) {
      clearInterval(pollingTimer);
      pollingTimer = null;
    }

    if (cleanupTimer) {
      clearInterval(cleanupTimer);
      cleanupTimer = null;
    }
  },
  async close() {
    this.stopWorker();

    if (pool) {
      await pool.end();
      pool = null;
    }
  }
};
