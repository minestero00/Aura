import { updateUserPreferences } from "@features/auth/api";
import {
  cancelDailyBriefingNotification,
  getDailyBriefNotificationStatus,
  scheduleDailyBriefingNotification
} from "@features/app/notifications";
import {
  getErrorMessage,
  normalizeMorningBriefTime,
  toTimeDraft
} from "@features/app/hooks/use-aura-app/helpers";
import type { DailyBriefModuleDeps } from "./daily-brief";

export async function refreshDailyBriefNotificationState(deps: DailyBriefModuleDeps) {
  if (!deps.authState) {
    return;
  }

  const enabled = await scheduleDailyBriefingNotification(
    deps.language,
    deps.authState.me.preferences.morningBriefTime
  );
  const status = await getDailyBriefNotificationStatus();

  deps.setAreDailyBriefNotificationsEnabled(enabled && status.enabled);
  deps.setIsNotificationPermissionGranted(status.permissionGranted);
}

export async function saveMorningBriefTime(deps: DailyBriefModuleDeps) {
  if (!deps.authState) {
    return;
  }

  const normalized = normalizeMorningBriefTime(deps.morningBriefTimeDraft);

  if (!normalized) {
    deps.setErrorMessage(
      deps.language === "ko"
        ? "브리핑 시간은 HH:MM 형식으로 입력해야 합니다."
        : "Brief time must use HH:MM format."
    );
    return;
  }

  try {
    deps.setErrorMessage(null);
    const { session } = await deps.withSessionAutoRefresh(accessToken =>
      updateUserPreferences(accessToken, {
        morningBriefTime: normalized,
        pushEnabled: deps.areDailyBriefNotificationsEnabled
      })
    );
    await deps.syncMe(session);
    const enabled = await scheduleDailyBriefingNotification(deps.language, normalized);
    const status = await getDailyBriefNotificationStatus();
    deps.setAreDailyBriefNotificationsEnabled(enabled && status.enabled);
    deps.setIsNotificationPermissionGranted(status.permissionGranted);
    deps.setMorningBriefTimeDraft(toTimeDraft(normalized));
  } catch (error: unknown) {
    deps.setErrorMessage(
      getErrorMessage(
        error,
        deps.language === "ko" ? "브리핑 시간을 저장할 수 없습니다." : "Unable to save the briefing time."
      )
    );
  }
}

export async function enableDailyBriefNotifications(deps: DailyBriefModuleDeps) {
  if (!deps.authState) {
    return;
  }

  const normalized =
    normalizeMorningBriefTime(deps.morningBriefTimeDraft) ?? deps.authState.me.preferences.morningBriefTime;

  try {
    deps.setErrorMessage(null);
    const { session } = await deps.withSessionAutoRefresh(accessToken =>
      updateUserPreferences(accessToken, {
        morningBriefTime: normalized,
        pushEnabled: true
      })
    );
    await deps.syncMe(session);
    const enabled = await scheduleDailyBriefingNotification(deps.language, normalized);
    const status = await getDailyBriefNotificationStatus();
    deps.setAreDailyBriefNotificationsEnabled(enabled && status.enabled);
    deps.setIsNotificationPermissionGranted(status.permissionGranted);
    deps.setMorningBriefTimeDraft(toTimeDraft(normalized));
  } catch (error: unknown) {
    deps.setErrorMessage(
      getErrorMessage(
        error,
        deps.language === "ko"
          ? "데일리 브리핑 알림을 켤 수 없습니다."
          : "Unable to enable the daily brief notification."
      )
    );
  }
}

export async function disableDailyBriefNotifications(deps: DailyBriefModuleDeps) {
  if (!deps.authState) {
    return;
  }

  try {
    deps.setErrorMessage(null);
    cancelDailyBriefingNotification();
    const { session } = await deps.withSessionAutoRefresh(accessToken =>
      updateUserPreferences(accessToken, {
        pushEnabled: false
      })
    );
    await deps.syncMe(session);
    const status = await getDailyBriefNotificationStatus();
    deps.setAreDailyBriefNotificationsEnabled(false);
    deps.setIsNotificationPermissionGranted(status.permissionGranted);
  } catch (error: unknown) {
    deps.setErrorMessage(
      getErrorMessage(
        error,
        deps.language === "ko"
          ? "데일리 브리핑 알림을 끌 수 없습니다."
          : "Unable to disable the daily brief notification."
      )
    );
  }
}
