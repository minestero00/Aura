import { createHash, randomBytes } from "node:crypto";

export interface SessionTokens {
  accessToken: string;
  refreshToken: string;
  accessTokenHash: string;
  refreshTokenHash: string;
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function generateOpaqueToken(prefix: string) {
  return `${prefix}_${randomBytes(24).toString("hex")}`;
}

export const tokenService = {
  createSessionTokens(): SessionTokens {
    const accessToken = generateOpaqueToken("aura_access");
    const refreshToken = generateOpaqueToken("aura_refresh");

    return {
      accessToken,
      refreshToken,
      accessTokenHash: hashToken(accessToken),
      refreshTokenHash: hashToken(refreshToken)
    };
  },
  hashToken
};
