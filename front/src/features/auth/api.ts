import { Platform } from "react-native";
import { apiRequest } from "@lib/api/client";
import type { AuthResponse, MeResponse, SessionPayload } from "@features/auth/types";

export async function signInWithGoogleToken(idToken: string, deviceId?: string) {
  return apiRequest<AuthResponse>("/api/v1/auth/google", {
    method: "POST",
    body: JSON.stringify({
      idToken,
      platform: Platform.OS === "android" ? "android" : "ios",
      deviceId
    })
  });
}

export async function fetchMe(accessToken: string) {
  return apiRequest<MeResponse>("/api/v1/me", {
    method: "GET",
    accessToken
  });
}

export async function refreshAuthSession(refreshToken: string) {
  return apiRequest<SessionPayload>("/api/v1/auth/refresh", {
    method: "POST",
    body: JSON.stringify({
      refreshToken
    })
  });
}

export async function logoutAuthSession(accessToken: string) {
  return apiRequest<void>("/api/v1/auth/logout", {
    method: "POST",
    accessToken
  });
}

export async function connectGmailIntegration(input: {
  accessToken?: string;
  serverAuthCode?: string;
  email: string;
  scopes: string[];
  sessionAccessToken: string;
}) {
  return apiRequest<{
    ok: true;
    integrations: MeResponse["integrations"];
  }>("/api/v1/integrations/gmail/connect", {
    method: "POST",
    accessToken: input.sessionAccessToken,
    body: JSON.stringify({
      accessToken: input.accessToken,
      serverAuthCode: input.serverAuthCode,
      email: input.email,
      scopes: input.scopes
    })
  });
}

export async function disconnectGmailIntegration(sessionAccessToken: string) {
  return apiRequest<{
    ok: true;
    integrations: MeResponse["integrations"];
  }>("/api/v1/integrations/gmail", {
    method: "DELETE",
    accessToken: sessionAccessToken
  });
}

export async function updateUserPreferences(
  accessToken: string,
  input: Partial<MeResponse["preferences"]> & { timezone?: string }
) {
  return apiRequest<{
    ok: true;
    preferences: MeResponse["preferences"] & { timezone: string };
  }>("/api/v1/me/preferences", {
    method: "PATCH",
    accessToken,
    body: JSON.stringify(input)
  });
}
