import React, { useEffect, useRef } from "react";
import { Platform, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import DateTimePicker, {
  DateTimePickerAndroid
} from "@react-native-community/datetimepicker";
import { SettingsStatusRow, SettingsSubpageHeader } from "@features/app/screens/settings/shared";
import { toPickerDate } from "@features/app/screens/settings/types";
import type { SettingsSectionProps } from "@features/app/screens/settings/sections/section-props";

// iOS spinner는 사용자가 휠 돌리는 동안 onChange가 연속 발생 — 매번 저장하면 API 폭주.
// Android dialog는 OK 누른 시점 1회만 발생하므로 debounce 불필요.
const IOS_SAVE_DEBOUNCE_MS = 600;

export function NotificationsSection(props: SettingsSectionProps) {
  const {
    styles,
    copy,
    areDailyBriefNotificationsEnabled,
    isNotificationPermissionGranted,
    morningBriefTime,
    morningBriefTimeDraft,
    onMorningBriefTimeDraftChange,
    onDisableDailyBriefNotifications,
    onEnableDailyBriefNotifications,
    onSaveMorningBriefTime,
    onSelectSettingsSection
  } = props;

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  function applySelectedDate(selectedDate: Date | undefined) {
    if (!selectedDate) return;
    const hours = String(selectedDate.getHours()).padStart(2, "0");
    const minutes = String(selectedDate.getMinutes()).padStart(2, "0");
    onMorningBriefTimeDraftChange(`${hours}:${minutes}`);

    if (Platform.OS === "android") {
      // Android dialog OK → 즉시 저장.
      void onSaveMorningBriefTime();
      return;
    }

    // iOS: 사용자가 spinner 멈춘 후 약간의 디바운스를 두고 저장.
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      void onSaveMorningBriefTime();
    }, IOS_SAVE_DEBOUNCE_MS);
  }

  function openAndroidTimePicker() {
    DateTimePickerAndroid.open({
      value: toPickerDate(morningBriefTimeDraft),
      mode: "time",
      is24Hour: true,
      onChange: (_, selectedDate) => applySelectedDate(selectedDate)
    });
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.settingsScreen}>
        <SettingsSubpageHeader
          styles={styles}
          title={copy.settings.notificationsTitle}
          subtitle={copy.settings.notificationsSubtitle}
          onSelectSettingsSection={onSelectSettingsSection}
        />
        <ScrollView contentContainerStyle={styles.scrollContent} style={styles.scrollView}>
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>{copy.settings.currentStatus}</Text>
            <SettingsStatusRow
              styles={styles}
              label={copy.settings.notificationsStatus}
              isOk={areDailyBriefNotificationsEnabled}
              issueText={copy.settings.notificationsDisabled}
              onIssuePress={() => onEnableDailyBriefNotifications()}
            />
            <SettingsStatusRow
              styles={styles}
              label={copy.settings.notificationsPermission}
              isOk={isNotificationPermissionGranted}
              issueText={copy.settings.notificationsBlocked}
              onIssuePress={() => onEnableDailyBriefNotifications()}
            />
            <Text style={styles.detailLine}>
              {copy.settings.notificationsTime}: {morningBriefTime ?? "09:00"}
            </Text>

            <View style={styles.sectionCard}>
              {Platform.OS === "android" ? (
                <Pressable onPress={openAndroidTimePicker} style={styles.outlineButton}>
                  <Text style={styles.outlineButtonText}>{morningBriefTimeDraft || "09:00"}</Text>
                </Pressable>
              ) : (
                <DateTimePicker
                  display="spinner"
                  mode="time"
                  onChange={(_, selectedDate) => applySelectedDate(selectedDate)}
                  value={toPickerDate(morningBriefTimeDraft)}
                />
              )}
            </View>

            <View style={styles.buttonRow}>
              <Pressable
                onPress={() =>
                  void (areDailyBriefNotificationsEnabled
                    ? onDisableDailyBriefNotifications()
                    : onEnableDailyBriefNotifications())
                }
                style={styles.secondaryButton}
              >
                <Text style={styles.secondaryButtonText}>
                  {areDailyBriefNotificationsEnabled
                    ? copy.settings.notificationsDisable
                    : copy.settings.notificationsEnable}
                </Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
