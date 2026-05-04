import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { jwtVerify } from "jose";
import { config } from "../../config/env.js";

let adminClient: SupabaseClient | null = null;
let cachedSecretBytes: Uint8Array | null = null;

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

/**
 * Verifies a Supabase access token (JWT). Throws on invalid/expired tokens.
 * Returns the parsed claims, including auth.users.id as `sub`.
 */
export async function verifySupabaseJwt(token: string): Promise<SupabaseJwtClaims> {
  const { payload } = await jwtVerify(token, getJwtSecretBytes(), {
    algorithms: ["HS256"]
  });
  if (!payload.sub || typeof payload.sub !== "string") {
    throw new Error("JWT missing sub claim");
  }
  return payload as unknown as SupabaseJwtClaims;
}
