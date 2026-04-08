import { OAuth2Client } from "google-auth-library";
import { config } from "../../../config/env.js";
import { AppError } from "../../../lib/errors/app-error.js";

function createOAuthClient() {
  if (!config.googleWebClientId || !config.googleClientSecret) {
    throw new AppError(
      500,
      "GOOGLE_GMAIL_SYNC_NOT_CONFIGURED",
      "Google web client ID or client secret is not configured for Gmail sync."
    );
  }

  return new OAuth2Client(config.googleWebClientId, config.googleClientSecret);
}

export async function exchangeServerAuthCode(serverAuthCode: string) {
  const oauthClient = createOAuthClient();
  const tokenResponse = await oauthClient.getToken({
    code: serverAuthCode
  });
  const tokens = tokenResponse.tokens;

  if (!tokens.access_token) {
    throw new AppError(
      400,
      "GOOGLE_TOKEN_EXCHANGE_FAILED",
      "Google did not return an access token for Gmail sync."
    );
  }

  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token ?? null,
    scope: tokens.scope ?? "",
    expiryDate: tokens.expiry_date ?? null
  };
}

export async function refreshGoogleAccessToken(refreshToken: string) {
  if (!config.googleWebClientId || !config.googleClientSecret) {
    throw new AppError(
      500,
      "GOOGLE_GMAIL_SYNC_NOT_CONFIGURED",
      "Google web client ID or client secret is not configured for Gmail sync."
    );
  }

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      client_id: config.googleWebClientId,
      client_secret: config.googleClientSecret,
      grant_type: "refresh_token",
      refresh_token: refreshToken
    })
  });

  const payload = (await response.json().catch(() => null)) as
    | {
        access_token?: string;
        expires_in?: number;
      }
    | null;

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
