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
    onSelectSettingsSection
  } = props;

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
            />
            <SettingsStatusRow
              styles={styles}
              label={copy.settings.permissionsNotifications}
              isOk={isNotificationPermissionGranted}
              issueText={copy.settings.notificationsBlocked}
            />
            <SettingsStatusRow
              styles={styles}
              label={copy.settings.permissionsGoogleCalendar}
              isOk={isGoogleCalendarConnected}
              issueText={copy.settings.refreshRequired}
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
