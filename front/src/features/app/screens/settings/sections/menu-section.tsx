import React from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { SettingsOkBadge } from "@features/app/screens/settings/shared";
import type { SettingsSectionProps } from "@features/app/screens/settings/sections/section-props";

export function MenuSection(props: SettingsSectionProps) {
  const {
    styles,
    copy,
    usage,
    language,
    gmailConnected,
    gmailAddress,
    isGmailRefreshRequired,
    ignoredSenderRules,
    enabledNewsCategories,
    labelCategory,
    isDeviceCalendarPermissionGranted,
    isNotificationPermissionGranted,
    areDailyBriefNotificationsEnabled,
    morningBriefTime,
    isAskFabHidden,
    onOpenPermissionsSettings,
    onOpenNotificationSettings,
    onOpenUsageSettings,
    onOpenDataPrivacySettings,
    onOpenGmailSettings,
    onOpenIgnoredSenderSettings,
    onOpenNewsSettings,
    onOpenLanguageSettings,
    onToggleAskFabHidden,
    onLogout
  } = props;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent} style={styles.scrollView}>
        <View style={styles.heroBare}>
          <Text style={styles.eyebrow}>{copy.settings.eyebrow}</Text>
          <Text style={styles.title}>{copy.settings.title}</Text>
          <Text style={styles.subtitle}>{copy.settings.subtitle}</Text>
        </View>

        <View style={styles.sectionCard}>
          <Pressable onPress={onOpenPermissionsSettings} style={styles.settingsMenuItem}>
            <View style={styles.settingsMenuMain}>
              <Text style={styles.messageSubject}>{copy.settings.menuPermissions}</Text>
              <View style={styles.settingsMenuMetaRow}>
                {isDeviceCalendarPermissionGranted && isNotificationPermissionGranted ? <SettingsOkBadge styles={styles} /> : null}
                <Text style={styles.messageMeta}>
                  {isDeviceCalendarPermissionGranted && isNotificationPermissionGranted
                    ? copy.common.ok
                    : copy.settings.notificationsBlocked}
                </Text>
              </View>
            </View>
            <Text style={styles.settingsChevron}>›</Text>
          </Pressable>
        </View>

        <View style={styles.sectionCard}>
          <Pressable onPress={onOpenNotificationSettings} style={styles.settingsMenuItem}>
            <View style={styles.settingsMenuMain}>
              <Text style={styles.messageSubject}>{copy.settings.menuNotifications}</Text>
              <View style={styles.settingsMenuMetaRow}>
                {areDailyBriefNotificationsEnabled ? <SettingsOkBadge styles={styles} /> : null}
                <Text style={styles.messageMeta}>
                  {areDailyBriefNotificationsEnabled
                    ? morningBriefTime ?? "09:00"
                    : copy.settings.notificationsDisabled}
                </Text>
              </View>
            </View>
            <Text style={styles.settingsChevron}>›</Text>
          </Pressable>
        </View>

        <View style={styles.sectionCard}>
          <Pressable onPress={onOpenUsageSettings} style={styles.settingsMenuItem}>
            <View style={styles.settingsMenuMain}>
              <Text style={styles.messageSubject}>{copy.settings.menuUsage}</Text>
              <Text style={styles.messageMeta}>
                {usage
                  ? copy.settings.usageOf(usage.counters.briefingsGenerated, usage.limits.dailyOverview)
                  : (language === "ko" ? "확인하기" : "View")}
              </Text>
            </View>
            <Text style={styles.settingsChevron}>›</Text>
          </Pressable>
        </View>

        <View style={styles.sectionCard}>
          <Pressable onPress={onOpenDataPrivacySettings} style={styles.settingsMenuItem}>
            <View style={styles.settingsMenuMain}>
              <Text style={styles.messageSubject}>{copy.settings.menuDataPrivacy}</Text>
              <Text style={styles.messageMeta}>{copy.settings.dataPrivacyMenuHint}</Text>
            </View>
            <Text style={styles.settingsChevron}>›</Text>
          </Pressable>
        </View>

        <View style={styles.sectionCard}>
          <Pressable onPress={onOpenGmailSettings} style={styles.settingsMenuItem}>
            <View style={styles.settingsMenuMain}>
              <Text style={styles.messageSubject}>{copy.settings.menuGmail}</Text>
              <View style={styles.settingsMenuMetaRow}>
                {gmailConnected && !isGmailRefreshRequired ? <SettingsOkBadge styles={styles} /> : null}
                <Text style={styles.messageMeta}>
                  {gmailConnected
                    ? isGmailRefreshRequired
                      ? copy.settings.refreshRequired
                      : gmailAddress ?? copy.settings.connected
                    : copy.settings.notConnected}
                </Text>
              </View>
            </View>
            <Text style={styles.settingsChevron}>›</Text>
          </Pressable>
        </View>

        <View style={styles.sectionCard}>
          <Pressable onPress={onOpenIgnoredSenderSettings} style={styles.settingsMenuItem}>
            <View style={styles.settingsMenuMain}>
              <Text style={styles.messageSubject}>{copy.settings.ignoredTitle}</Text>
              <Text style={styles.messageMeta}>{copy.settings.menuIgnored(ignoredSenderRules.length)}</Text>
            </View>
            <Text style={styles.settingsChevron}>›</Text>
          </Pressable>
        </View>

        <View style={styles.sectionCard}>
          <Pressable onPress={onOpenNewsSettings} style={styles.settingsMenuItem}>
            <View style={styles.settingsMenuMain}>
              <Text style={styles.messageSubject}>{copy.settings.menuNewsTopics}</Text>
              <Text style={styles.messageMeta}>
                {enabledNewsCategories.map(category => labelCategory(category)).join(", ")}
              </Text>
            </View>
            <Text style={styles.settingsChevron}>›</Text>
          </Pressable>
        </View>

        <View style={styles.sectionCard}>
          <Pressable onPress={onOpenLanguageSettings} style={styles.settingsMenuItem}>
            <View style={styles.settingsMenuMain}>
              <Text style={styles.messageSubject}>{copy.settings.menuLanguage}</Text>
              <Text style={styles.messageMeta}>
                {language === "ko" ? copy.settings.languageKorean : copy.settings.languageEnglish}
              </Text>
            </View>
            <Text style={styles.settingsChevron}>›</Text>
          </Pressable>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>{copy.display.sectionTitle}</Text>
          <Pressable
            accessibilityRole="switch"
            accessibilityState={{ checked: !isAskFabHidden }}
            onPress={() => void onToggleAskFabHidden()}
            style={styles.settingsMenuItem}
          >
            <View style={styles.settingsMenuMain}>
              <Text style={styles.messageSubject}>{copy.display.askFabLabel}</Text>
              <Text style={styles.messageMeta}>{copy.display.askFabSubtitle}</Text>
            </View>
            <Text style={styles.messageMeta}>
              {isAskFabHidden ? copy.settings.off : copy.settings.on}
            </Text>
          </Pressable>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.dangerTitle}>{copy.settings.logoutTitle}</Text>
          <Text style={styles.helperText}>{copy.settings.logoutSubtitle}</Text>
          <View style={styles.buttonRow}>
            <Pressable onPress={() => void onLogout()} style={styles.dangerButton}>
              <Text style={styles.dangerButtonText}>{copy.settings.logoutAction}</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
