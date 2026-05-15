/**
 * Identity represented after Supabase JWT verification.
 * `id` is the auth.users(id) UUID.
 */
export interface AuthenticatedUser {
  id: string;
  email: string | null;
  phone: string | null;
  planTier: "free" | "pro" | "admin";
  accountType: "personal" | "business";
}
