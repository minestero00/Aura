import { apiRequest } from "@lib/api/client";
import type { MeResponse } from "@features/auth/types";

/**
 * Sign-in / refresh / logout are handled by Supabase Client SDK on the device.
 * Backend only verifies JWTs and serves /auth/me.
 */
export async function fetchMe() {
  return apiRequest<MeResponse>("/api/v1/auth/me", { method: "GET" });
}

export async function connectGmailIntegration(input: {
  accessToken?: string;
  serverAuthCode?: string;
  email: string;
  scopes: string[];
}) {
  return apiRequest<{ ok: true; integrations: MeResponse["integrations"] }>(
    "/api/v1/integrations/gmail/connect",
    {
      method: "POST",
      body: JSON.stringify({
        accessToken: input.accessToken,
        serverAuthCode: input.serverAuthCode,
        email: input.email,
        scopes: input.scopes
      })
    }
  );
}

export async function disconnectGmailIntegration() {
  return apiRequest<{ ok: true; integrations: MeResponse["integrations"] }>(
    "/api/v1/integrations/gmail",
    { method: "DELETE" }
  );
}

export async function updateUserPreferences(
  input: Partial<NonNullable<MeResponse["preferences"]>> & { timezone?: string }
) {
  return apiRequest<{
    ok: true;
    preferences: NonNullable<MeResponse["preferences"]> & { timezone: string };
  }>("/api/v1/me/preferences", {
    method: "PATCH",
    body: JSON.stringify(input)
  });
}
