import { updateUserPreferences } from "@features/auth/api";
import {
  ensureDailyBriefNotificationPermission,
  getDailyBriefNotificationStatus
} from "@features/app/notifications";
import {
  getErrorMessage,
  normalizeMorningBriefTime,
  toTimeDraft
} from "@features/app/hooks/use-aura-app/helpers";
import type { DailyBriefModuleDeps } from "./daily-brief";

// Daily brief 알림은 backend cron이 FCM/APNs로 발송 (back/src/modules/briefings/push.ts).
// 토글의 진실은 server `pushEnabled`. permission은 사용자가 알림을 받을 수 있는 환경인지의
// 시각적 status만 표시 (차단되어 있으면 settings 화면에서 안내).

export async function refreshDailyBriefNotificationState(deps: DailyBriefModuleDeps) {
  if (!deps.authState) {
    return;
  }

  const status = await getDailyBriefNotificationStatus();
  const serverPushEnabled = Boolean(deps.authState.me.preferences.pushEnabled);

  deps.setAreDailyBriefNotificationsEnabled(serverPushEnabled);
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
      updateUserPreferences( {
        morningBriefTime: normalized,
        pushEnabled: deps.areDailyBriefNotificationsEnabled
      })
    );
    const updatedMe = await deps.syncMe(session);
    const status = await getDailyBriefNotificationStatus();
    deps.setAreDailyBriefNotificationsEnabled(Boolean(updatedMe.preferences.pushEnabled));
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
    // 권한이 거부된 상태에서 토글을 켜도 server 저장은 진행 — 사용자가 OS Settings에서
    // 권한을 켜는 흐름은 별도. 단, status row에는 거부 상태가 노출됨.
    await ensureDailyBriefNotificationPermission();
    const { session } = await deps.withSessionAutoRefresh(accessToken =>
      updateUserPreferences( {
        morningBriefTime: normalized,
        pushEnabled: true
      })
    );
    const updatedMe = await deps.syncMe(session);
    const status = await getDailyBriefNotificationStatus();
    deps.setAreDailyBriefNotificationsEnabled(Boolean(updatedMe.preferences.pushEnabled));
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
    const { session } = await deps.withSessionAutoRefresh(accessToken =>
      updateUserPreferences( {
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
