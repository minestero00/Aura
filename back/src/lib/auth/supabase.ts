import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";
import { config } from "../../config/env.js";

let adminClient: SupabaseClient | null = null;
let cachedSecretBytes: Uint8Array | null = null;
let cachedJwks: ReturnType<typeof createRemoteJWKSet> | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (!adminClient) {
    if (!config.supabaseUrl || !config.supabaseServiceRoleKey) {
      throw new Error(
        "Supabase admin client unavailable: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set."
      );
    }
    adminClient = createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
  }
  return adminClient;
}

function getJwtSecretBytes(): Uint8Array {
  if (!cachedSecretBytes) {
    if (!config.supabaseJwtSecret) {
      throw new Error("SUPABASE_JWT_SECRET is not configured.");
    }
    cachedSecretBytes = new TextEncoder().encode(config.supabaseJwtSecret);
  }
  return cachedSecretBytes;
}

function getJwks() {
  if (!cachedJwks) {
    if (!config.supabaseUrl) {
      throw new Error("SUPABASE_URL is required for JWKS fetch.");
    }
    cachedJwks = createRemoteJWKSet(
      new URL(`${config.supabaseUrl.replace(/\/$/, "")}/auth/v1/.well-known/jwks.json`)
    );
  }
  return cachedJwks;
}

export interface SupabaseJwtClaims {
  sub: string;
  email?: string;
  phone?: string;
  role?: string;
  app_metadata?: Record<string, unknown>;
  user_metadata?: Record<string, unknown>;
  exp: number;
  iat: number;
  aud?: string | string[];
}

function assertClaims(payload: JWTPayload): SupabaseJwtClaims {
  if (!payload.sub || typeof payload.sub !== "string") {
    throw new Error("JWT missing sub claim");
  }
  return payload as unknown as SupabaseJwtClaims;
}

/**
 * Verifies a Supabase access token. Supports both modern asymmetric keys
 * (ES256/RS256 via JWKS endpoint, default for projects created late 2024+)
 * and legacy HS256 shared secret. Tries JWKS first, falls back to HS256.
 */
export async function verifySupabaseJwt(token: string): Promise<SupabaseJwtClaims> {
  try {
    const { payload } = await jwtVerify(token, getJwks(), {
      algorithms: ["ES256", "RS256"]
    });
    return assertClaims(payload);
  } catch (jwksError) {
    if (!config.supabaseJwtSecret) {
      throw jwksError;
    }
    const { payload } = await jwtVerify(token, getJwtSecretBytes(), {
      algorithms: ["HS256"]
    });
    return assertClaims(payload);
  }
}
