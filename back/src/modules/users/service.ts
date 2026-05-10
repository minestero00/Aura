import { AppError } from "../../lib/errors/app-error.js";
import type { z } from "zod";
import { briefingsService } from "../briefings/service.js";
import { authStore } from "../auth/store.js";
import { updatePreferencesSchema } from "./schemas.js";

type UpdatePreferencesInput = z.infer<typeof updatePreferencesSchema>;

export const usersService = {
  getMe(userId: string) {
    const user = authStore.findUserById(userId);
    const preferences = authStore.getPreferences(userId);

    if (!user || !preferences) {
      throw new AppError(404, "USER_NOT_FOUND", "User could not be found.");
    }

    const gmailConnection = authStore.getGmailConnection(userId);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
        timezone: user.timezone,
        planTier: user.planTier
      },
      preferences: {
        newsCategories: preferences.newsCategories,
        summaryLength: preferences.summaryLength,
        pushEnabled: preferences.pushEnabled,
        morningBriefTime: preferences.morningBriefTime,
        eveningBriefTime: preferences.eveningBriefTime,
        departureAlertsEnabled: preferences.departureAlertsEnabled,
        departureBufferMinutes: preferences.departureBufferMinutes
      },
      integrations: {
        gmailConnected: user.gmailConnected,
        gmailAddress: gmailConnection?.email ?? null,
        gmailScopes: gmailConnection?.scopes ?? [],
        gmailConnectedAt: gmailConnection?.connectedAt.toISOString() ?? null,
        gmailSyncReady: Boolean(gmailConnection?.refreshToken),
        gmailAccessExpiresAt: gmailConnection?.expiresAt?.toISOString() ?? null,
        calendarConnected: Boolean(
          gmailConnection?.scopes.some(
            scope =>
              scope === "https://www.googleapis.com/auth/calendar.readonly" ||
              scope.includes("calendar.readonly")
          )
        )
      }
    };
  },
  updatePreferences(userId: string, input: UpdatePreferencesInput) {
    const updated = authStore.updatePreferences(userId, {
      newsCategories: input.newsCategories,
      summaryLength: input.summaryLength,
      pushEnabled: input.pushEnabled,
      morningBriefTime: input.morningBriefTime,
      eveningBriefTime: input.eveningBriefTime,
      timezone: input.timezone,
      departureAlertsEnabled: input.departureAlertsEnabled,
      departureBufferMinutes: input.departureBufferMinutes
    });

    if (!updated) {
      throw new AppError(404, "USER_NOT_FOUND", "User could not be found.");
    }

    briefingsService.touchUserSchedule(userId);

    return {
      ok: true,
      preferences: {
        newsCategories: updated.newsCategories,
        summaryLength: updated.summaryLength,
        pushEnabled: updated.pushEnabled,
        morningBriefTime: updated.morningBriefTime,
        eveningBriefTime: updated.eveningBriefTime,
        timezone: updated.timezone,
        departureAlertsEnabled: updated.departureAlertsEnabled,
        departureBufferMinutes: updated.departureBufferMinutes
      }
    };
  }
};
