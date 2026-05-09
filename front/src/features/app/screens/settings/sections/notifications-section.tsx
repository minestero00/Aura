import React from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import DateTimePicker from "@react-native-community/datetimepicker";
import { SettingsStatusRow, SettingsSubpageHeader } from "@features/app/screens/settings/shared";
import { toPickerDate } from "@features/app/screens/settings/types";
import type { SettingsSectionProps } from "@features/app/screens/settings/sections/section-props";

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
              <DateTimePicker
                display="spinner"
                mode="time"
                onValueChange={(_, selectedDate) => {
                  const hours = String(selectedDate.getHours()).padStart(2, "0");
                  const minutes = String(selectedDate.getMinutes()).padStart(2, "0");
                  onMorningBriefTimeDraftChange(`${hours}:${minutes}`);
                }}
                value={toPickerDate(morningBriefTimeDraft)}
              />
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

              <Pressable onPress={() => void onSaveMorningBriefTime()} style={styles.outlineButton}>
                <Text style={styles.outlineButtonText}>{copy.settings.notificationsRefresh}</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
