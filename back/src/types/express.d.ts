import type { AuthenticatedUser } from "../modules/auth/types.js";

declare global {
  namespace Express {
    interface Request {
      requestId: string;
      authUser?: AuthenticatedUser;
      authSessionId?: string;
      authAccessToken?: string;
    }
  }
}

export {};
