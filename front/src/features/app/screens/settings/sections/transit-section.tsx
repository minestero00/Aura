import React, { useCallback, useEffect, useState } from "react";
import { AppState, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ClientActiveTripBanner,
  SearchTripScreen,
  createActiveTripFromOption,
  loadActiveTrip,
  saveActiveTrip
} from "@features/transit";
import type { ActiveTripState, DirectionsOption } from "@features/transit";
import {
  getBatteryOptimizationStatus,
  getLocationAuthorizationStatus,
  openLocationSettings,
  requestIgnoreBatteryOptimizations,
  subscribeBackgroundError,
  type LocationAuthStatus
} from "@features/transit/native-geofence";
import {
  ensureTransitNotificationPermission,
  getTransitNotificationStatus,
  type TransitNotificationStatus
} from "@features/transit/notifications";
import type { SettingsSectionProps } from "@features/app/screens/settings/sections/section-props";
import { SettingsSubpageHeader } from "@features/app/screens/settings/shared";
import { useAuraTheme } from "@features/app/styles";

/**
 * 정류장 도착 알림 — settings sub-section.
 *
 * Wallet과 동일 패턴: settings 탭 안에서 fullscreen sub-section + bottom-nav 중앙
 * "위치" indicator. Modal 아님 → SwipeBackContainer가 좌측 edge swipe로 자동 복귀.
 *
 * Background 알림 신뢰성 확보 — 상단에 권한/배터리 체크리스트 표시. 미충족 항목이
 * 있으면 사용자가 즉시 조치할 수 있도록 prominent badge + 액션 버튼.
 *
 * 진입 경로:
 * - Menu / nav-expand drawer → "정류장 도착 알림"
 * - 외부에서 `setSelectedTab("settings") + setSelectedSettingsSection("transit")`
 */
export function TransitSection(props: SettingsSectionProps) {
  const { copy, language, styles, onSelectSettingsSection } = props;
  const [activeTrip, setActiveTrip] = useState<ActiveTripState | null>(null);

  // 권한/배터리 상태 — sub-section mount + foreground 복귀 시 갱신.
  const [locationStatus, setLocationStatus] = useState<LocationAuthStatus>("unknown");
  const [notifStatus, setNotifStatus] = useState<TransitNotificationStatus>("notDetermined");
  const [batteryStatus, setBatteryStatus] = useState<"exempt" | "optimized" | "unknown">("exempt");

  // Native geofence 등록 실패/모니터링 에러 — 사용자에게 노출해야 silent failure 피함.
  const [nativeError, setNativeError] = useState<string | null>(null);

  const refreshPermissions = useCallback(async () => {
    const [loc, notif, batt] = await Promise.all([
      getLocationAuthorizationStatus(),
      getTransitNotificationStatus(),
      getBatteryOptimizationStatus()
    ]);
    setLocationStatus(loc);
    setNotifStatus(notif);
    setBatteryStatus(batt);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void loadActiveTrip().then(trip => {
      if (!cancelled) setActiveTrip(trip);
    });
    void refreshPermissions();
    const appStateSub = AppState.addEventListener("change", state => {
      if (state === "active") void refreshPermissions();
    });
    // iOS Region monitoring 한계 초과 / Android Play Services 미설치 등 native에서 오는
    // 에러를 화면에 즉시 노출.
    const unsubscribeError = subscribeBackgroundError(event => {
      setNativeError(event.message);
    });
    return () => {
      cancelled = true;
      appStateSub.remove();
      unsubscribeError();
    };
  }, [refreshPermissions]);

  async function handleSelectOption(option: DirectionsOption, destinationLabel: string) {
    // 옵션 카드 탭 = trip 시작 확정. 목적지 확정은 SearchTripScreen 안의
    // DestinationConfirmModal이 사전 단계로 이미 처리.
    const trip = createActiveTripFromOption(option, destinationLabel || "Trip");
    await saveActiveTrip(trip);
    setActiveTrip(trip);
  }

  function handleBackToMenu() {
    onSelectSettingsSection("menu");
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.settingsScreen}>
        <SettingsSubpageHeader
          styles={styles}
          title={copy.transit?.title ?? "정류장 도착 알림"}
          subtitle={copy.transit?.subtitle}
          onSelectSettingsSection={onSelectSettingsSection}
        />
        <View style={localStyles.body}>
          <PermissionChecklist
            locationStatus={locationStatus}
            notifStatus={notifStatus}
            batteryStatus={batteryStatus}
            language={language}
            onRefresh={refreshPermissions}
          />
          {nativeError ? (
            <View style={localStyles.errorBanner}>
              <Text style={localStyles.errorText}>
                {language === "ko" ? "백그라운드 알림 오류" : "Background alert error"}: {nativeError}
              </Text>
              <Pressable onPress={() => setNativeError(null)} hitSlop={8}>
                <Text style={localStyles.errorClose}>×</Text>
              </Pressable>
            </View>
          ) : null}
          {activeTrip ? (
            <ClientActiveTripBanner
              trip={activeTrip}
              language={language}
              onChange={setActiveTrip}
              onClose={handleBackToMenu}
            />
          ) : (
            <SearchTripScreen
              language={language}
              onSelectOption={(option, label) => void handleSelectOption(option, label)}
            />
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

// ============================================================================
// Permission Checklist
// ============================================================================

interface PermissionChecklistProps {
  locationStatus: LocationAuthStatus;
  notifStatus: TransitNotificationStatus;
  batteryStatus: "exempt" | "optimized" | "unknown";
  language: "ko" | "en";
  onRefresh: () => void | Promise<void>;
}

interface RowState {
  key: string;
  label: string;
  ok: boolean;
  hint: string;
  actionLabel?: string;
  onAction?: () => void | Promise<void>;
}

function PermissionChecklist({
  locationStatus,
  notifStatus,
  batteryStatus,
  language,
  onRefresh
}: PermissionChecklistProps) {
  const theme = useAuraTheme();
  const isKo = language === "ko";

  const rows: RowState[] = [
    {
      key: "location",
      label: isKo ? "위치 권한 (항상 허용)" : "Location (Always)",
      ok: locationStatus === "always",
      hint:
        locationStatus === "always"
          ? isKo
            ? "백그라운드에서도 정상 동작해요."
            : "Works in background."
          : locationStatus === "whenInUse"
            ? isKo
              ? "지금은 앱이 열려 있을 때만 동작해요. '항상 허용'으로 바꿔야 백그라운드 알림이 와요."
              : "Only works while app is open. Switch to 'Always' for background alerts."
            : isKo
              ? "위치 권한이 필요해요."
              : "Location permission required.",
      actionLabel:
        locationStatus !== "always"
          ? isKo
            ? "설정 열기"
            : "Open Settings"
          : undefined,
      onAction: async () => {
        await openLocationSettings();
      }
    },
    {
      key: "notification",
      label: isKo ? "알림 권한" : "Notifications",
      ok: notifStatus === "granted",
      hint:
        notifStatus === "granted"
          ? isKo
            ? "도착 시 알림을 받아요."
            : "Arrival alerts enabled."
          : notifStatus === "notDetermined"
            ? isKo
              ? "알림 권한이 아직 결정되지 않았어요."
              : "Notification permission not requested yet."
            : isKo
              ? "알림이 꺼져 있어요."
              : "Notifications are off.",
      actionLabel:
        notifStatus !== "granted"
          ? isKo
            ? notifStatus === "notDetermined"
              ? "권한 요청"
              : "설정 열기"
            : notifStatus === "notDetermined"
              ? "Request"
              : "Open Settings"
          : undefined,
      onAction: async () => {
        if (notifStatus === "notDetermined") {
          await ensureTransitNotificationPermission();
          await onRefresh();
        } else {
          await openLocationSettings();
        }
      }
    }
  ];

  if (Platform.OS === "android" && batteryStatus !== "unknown") {
    rows.push({
      key: "battery",
      label: isKo ? "배터리 최적화 제외" : "Battery Optimization",
      ok: batteryStatus === "exempt",
      hint:
        batteryStatus === "exempt"
          ? isKo
            ? "기기가 슬립 상태여도 알림이 와요."
            : "Alerts arrive even when device sleeps."
          : isKo
            ? "배터리 최적화가 켜져 있으면 알림이 지연되거나 누락될 수 있어요."
            : "Battery optimization may delay or drop alerts.",
      actionLabel:
        batteryStatus !== "exempt"
          ? isKo
            ? "최적화 제외"
            : "Exclude"
          : undefined,
      onAction: async () => {
        await requestIgnoreBatteryOptimizations();
        await onRefresh();
      }
    });
  }

  const allOk = rows.every(r => r.ok);
  if (allOk) return null;

  return (
    <View
      style={[
        localStyles.checklist,
        { backgroundColor: theme.colors.warningSoft ?? theme.colors.surfaceMuted }
      ]}
    >
      <Text style={[localStyles.checklistHeader, { color: theme.colors.textPrimary }]}>
        {isKo ? "백그라운드 알림 준비" : "Background alert checks"}
      </Text>
      {rows.map(row => (
        <View key={row.key} style={localStyles.row}>
          <Text style={[localStyles.statusIcon, { color: row.ok ? theme.colors.success ?? "#22c55e" : theme.colors.dangerText ?? "#ef4444" }]}>
            {row.ok ? "✓" : "✗"}
          </Text>
          <View style={localStyles.rowBody}>
            <Text style={[localStyles.rowLabel, { color: theme.colors.textPrimary }]}>
              {row.label}
            </Text>
            <Text style={[localStyles.rowHint, { color: theme.colors.textSecondary }]}>
              {row.hint}
            </Text>
          </View>
          {row.actionLabel && row.onAction ? (
            <Pressable
              onPress={() => void row.onAction!()}
              style={[localStyles.rowAction, { backgroundColor: theme.colors.accent }]}
              accessibilityRole="button"
            >
              <Text style={[localStyles.rowActionText, { color: theme.colors.accentText }]}>
                {row.actionLabel}
              </Text>
            </Pressable>
          ) : null}
        </View>
      ))}
    </View>
  );
}

const localStyles = StyleSheet.create({
  body: { flex: 1 },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "rgba(239, 68, 68, 0.12)",
    gap: 10
  },
  errorText: { flex: 1, color: "#b91c1c", fontSize: 13, lineHeight: 18, fontWeight: "600" },
  errorClose: { color: "#b91c1c", fontSize: 18, fontWeight: "800", paddingHorizontal: 4 },
  checklist: {
    margin: 16,
    padding: 14,
    borderRadius: 14,
    gap: 12
  },
  checklistHeader: {
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 2
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10
  },
  statusIcon: {
    fontSize: 18,
    fontWeight: "800",
    width: 18,
    textAlign: "center",
    marginTop: 1
  },
  rowBody: { flex: 1, gap: 2 },
  rowLabel: { fontSize: 14, fontWeight: "700" },
  rowHint: { fontSize: 12, lineHeight: 16 },
  rowAction: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    alignSelf: "center"
  },
  rowActionText: { fontSize: 13, fontWeight: "700" }
});
