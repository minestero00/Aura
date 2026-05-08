import { AppError } from "../../lib/errors/app-error.js";
import { authStore } from "./store.js";

export function requireUser(userId: string) {
  const user = authStore.findUserById(userId);

  if (!user) {
    throw new AppError(404, "USER_NOT_FOUND", "User could not be found.");
  }

  return user;
}

export async function requireUserContext(userId: string) {
  let user = authStore.findUserById(userId);
  let preferences = authStore.getPreferences(userId);

  if (!user || !preferences) {
    const loaded = await authStore.ensureUserContext(userId);
    user = loaded?.user ?? null;
    preferences = loaded?.preferences ?? null;
  }

  if (!user || !preferences) {
    throw new AppError(404, "USER_NOT_FOUND", "User could not be found.");
  }

  return { user, preferences };
}
