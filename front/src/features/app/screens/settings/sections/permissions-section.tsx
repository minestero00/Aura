import React from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { SettingsStatusRow, SettingsSubpageHeader } from "@features/app/screens/settings/shared";
import type { SettingsSectionProps } from "@features/app/screens/settings/sections/section-props";

export function PermissionsSection(props: SettingsSectionProps) {
  const {
    styles,
    copy,
    isDeviceCalendarPermissionGranted,
    isNotificationPermissionGranted,
    isGoogleCalendarConnected,
    onConnectDeviceCalendar,
    onOpenSystemSettings,
    onConnectGmail,
    onSelectSettingsSection,
    onEnableDailyBriefNotifications
  } = props;

  // Status row 클릭 시점에 직접 권한 요청. 거부됐다면 fallback으로 OS 설정 열기.
  // (각 핸들러가 이미 거부 상태에서는 Settings 안내 modal/deep link를 자체적으로 띄움.)
  const handleCalendarIssue = async () => {
    await onConnectDeviceCalendar();
  };
  const handleNotificationIssue = async () => {
    await onEnableDailyBriefNotifications();
  };
  const handleGoogleIssue = async () => {
    await onConnectGmail();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.settingsScreen}>
        <SettingsSubpageHeader
          styles={styles}
          title={copy.settings.permissionsTitle}
          subtitle={copy.settings.permissionsSubtitle}
          onSelectSettingsSection={onSelectSettingsSection}
        />
        <ScrollView contentContainerStyle={styles.scrollContent} style={styles.scrollView}>
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>{copy.settings.currentStatus}</Text>
            <SettingsStatusRow
              styles={styles}
              label={copy.settings.permissionsDeviceCalendar}
              isOk={isDeviceCalendarPermissionGranted}
              issueText={copy.todo.deviceConnectTitle}
              onIssuePress={handleCalendarIssue}
            />
            <SettingsStatusRow
              styles={styles}
              label={copy.settings.permissionsNotifications}
              isOk={isNotificationPermissionGranted}
              issueText={copy.settings.notificationsBlocked}
              onIssuePress={handleNotificationIssue}
            />
            <SettingsStatusRow
              styles={styles}
              label={copy.settings.permissionsGoogleCalendar}
              isOk={isGoogleCalendarConnected}
              issueText={copy.settings.refreshRequired}
              onIssuePress={handleGoogleIssue}
            />

            <View style={styles.buttonRow}>
              {!isDeviceCalendarPermissionGranted ? (
                <Pressable onPress={() => void onConnectDeviceCalendar()} style={styles.secondaryButton}>
                  <Text style={styles.secondaryButtonText}>{copy.todo.deviceConnectAction}</Text>
                </Pressable>
              ) : null}
              <Pressable onPress={() => void onOpenSystemSettings()} style={styles.secondaryButton}>
                <Text style={styles.secondaryButtonText}>{copy.settings.permissionsOpenSettings}</Text>
              </Pressable>
              <Pressable onPress={() => void onConnectGmail()} style={styles.outlineButton}>
                <Text style={styles.outlineButtonText}>{copy.settings.permissionsReconnectGoogle}</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
