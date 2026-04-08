import { Platform } from "react-native";
import { apiRequest } from "../../lib/api/client";
import type { AuthResponse, MeResponse } from "./types";

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
