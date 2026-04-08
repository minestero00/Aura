export interface AuthenticatedUser {
  id: string;
  email: string;
  planTier: "free" | "pro" | "admin";
}
