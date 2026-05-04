import { config } from "../../../config/env.js";
import { AppError } from "../../../lib/errors/app-error.js";

const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";

interface GoogleTokenResponse {
  access_token?: string;
  refresh_token?: string;
  scope?: string;
  expires_in?: number;
  token_type?: string;
}

function ensureCredentials() {
  if (!config.googleWebClientId || !config.googleClientSecret) {
    throw new AppError(
      500,
      "GOOGLE_GMAIL_SYNC_NOT_CONFIGURED",
      "Google web client ID or client secret is not configured for Gmail sync."
    );
  }
}

export async function exchangeServerAuthCode(serverAuthCode: string) {
  ensureCredentials();

  const response = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: config.googleWebClientId,
      client_secret: config.googleClientSecret,
      grant_type: "authorization_code",
      code: serverAuthCode
    })
  });

  const tokens = (await response.json().catch(() => null)) as GoogleTokenResponse | null;

  if (!response.ok || !tokens?.access_token) {
    throw new AppError(
      400,
      "GOOGLE_TOKEN_EXCHANGE_FAILED",
      "Google did not return an access token for Gmail sync.",
      tokens
    );
  }

  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token ?? null,
    scope: tokens.scope ?? "",
    expiryDate:
      typeof tokens.expires_in === "number"
        ? Date.now() + tokens.expires_in * 1000
        : null
  };
}

export async function refreshGoogleAccessToken(refreshToken: string) {
  ensureCredentials();

  const response = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: config.googleWebClientId,
      client_secret: config.googleClientSecret,
      grant_type: "refresh_token",
      refresh_token: refreshToken
    })
  });

  const payload = (await response.json().catch(() => null)) as GoogleTokenResponse | null;

  if (!response.ok || !payload?.access_token) {
    throw new AppError(
      401,
      "GOOGLE_REFRESH_FAILED",
      "Unable to refresh the Gmail access token.",
      payload
    );
  }

  return {
    accessToken: payload.access_token,
    expiresAt:
      typeof payload.expires_in === "number"
        ? new Date(Date.now() + payload.expires_in * 1000)
        : null
  };
}
