import { OAuth2Client } from "google-auth-library";
import { config } from "../../config/env.js";
import { AppError } from "../../lib/errors/app-error.js";

export interface GoogleProfile {
  googleUserId: string;
  email: string;
  name: string;
}

const oauthClient = new OAuth2Client();

function getGoogleAudiences() {
  const audiences = [
    config.googleWebClientId,
    config.googleIosClientId,
    config.googleAndroidClientId
  ].filter((value): value is string => Boolean(value));

  if (audiences.length === 0) {
    throw new AppError(
      500,
      "GOOGLE_AUTH_NOT_CONFIGURED",
      "Google OAuth client IDs are not configured."
    );
  }

  return audiences;
}

export async function verifyGoogleProfile(idToken: string): Promise<GoogleProfile> {
  const ticket = await oauthClient.verifyIdToken({
    idToken,
    audience: getGoogleAudiences()
  });

  const payload = ticket.getPayload();

  if (!payload?.sub || !payload?.email) {
    throw new AppError(401, "INVALID_GOOGLE_TOKEN", "Google token payload is missing required fields.");
  }

  return {
    googleUserId: payload.sub,
    email: payload.email,
    name: payload.name || payload.email.split("@")[0] || "Aura User"
  };
}
