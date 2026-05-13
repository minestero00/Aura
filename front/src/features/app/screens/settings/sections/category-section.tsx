import React from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { SettingsOkBadge, SettingsSubpageHeader } from "@features/app/screens/settings/shared";
import type { SettingsSectionProps } from "@features/app/screens/settings/sections/section-props";
import type { SettingsSectionKey } from "@features/app/types";

interface CategoryMenuItem {
  title: string;
  meta?: string;
  ok?: boolean;
  onPress: () => void;
}

function CategoryShell({
  styles,
  title,
  subtitle,
  items,
  onSelectSettingsSection,
  footer
}: {
  styles: SettingsSectionProps["styles"];
  title: string;
  subtitle: string;
  items: CategoryMenuItem[];
  onSelectSettingsSection: (section: SettingsSectionKey) => void;
  footer?: React.ReactNode;
}) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <SettingsSubpageHeader
        styles={styles}
        title={title}
        subtitle={subtitle}
        onSelectSettingsSection={onSelectSettingsSection}
        parentSection="menu"
      />
      <ScrollView contentContainerStyle={styles.scrollContent} style={styles.scrollView}>
        {items.map(item => (
          <View key={item.title} style={styles.sectionCard}>
            <Pressable onPress={item.onPress} style={styles.settingsMenuItem}>
              <View style={styles.settingsMenuMain}>
                <Text style={styles.messageSubject}>{item.title}</Text>
                {item.meta || item.ok ? (
                  <View style={styles.settingsMenuMetaRow}>
                    {item.ok ? <SettingsOkBadge styles={styles} /> : null}
                    {item.meta ? <Text style={styles.messageMeta}>{item.meta}</Text> : null}
                  </View>
                ) : null}
              </View>
              <Text style={styles.settingsChevron}>›</Text>
            </Pressable>
          </View>
        ))}
        {footer}
      </ScrollView>
    </SafeAreaView>
  );
}

export function AccountCategorySection(props: SettingsSectionProps) {
  const {
    styles,
    copy,
    language,
    gmailConnected,
    gmailAddress,
    isGmailRefreshRequired,
    isDeviceCalendarPermissionGranted,
    isNotificationPermissionGranted,
    onOpenGmailSettings,
    onOpenLanguageSettings,
    onOpenPermissionsSettings,
    onSelectSettingsSection,
    onLogout
  } = props;

  const items: CategoryMenuItem[] = [
    {
      title: copy.settings.menuGmail,
      ok: gmailConnected && !isGmailRefreshRequired,
      meta: gmailConnected
        ? isGmailRefreshRequired
          ? copy.settings.refreshRequired
          : gmailAddress ?? copy.settings.connected
        : copy.settings.notConnected,
      onPress: onOpenGmailSettings
    },
    {
      title: copy.settings.menuPermissions,
      ok: isDeviceCalendarPermissionGranted && isNotificationPermissionGranted,
      meta:
        isDeviceCalendarPermissionGranted && isNotificationPermissionGranted
          ? copy.common.ok
          : copy.settings.notificationsBlocked,
      onPress: onOpenPermissionsSettings
    },
    {
      title: copy.settings.menuLanguage,
      meta: language === "ko" ? copy.settings.languageKorean : copy.settings.languageEnglish,
      onPress: onOpenLanguageSettings
    }
  ];

  return (
    <CategoryShell
      styles={styles}
      title={copy.settings.catAccountTitle}
      subtitle={copy.settings.catAccountSubtitle}
      items={items}
      onSelectSettingsSection={onSelectSettingsSection}
      footer={
        <View style={styles.sectionCard}>
          <Text style={styles.dangerTitle}>{copy.settings.logoutTitle}</Text>
          <Text style={styles.helperText}>{copy.settings.logoutSubtitle}</Text>
          <View style={styles.buttonRow}>
            <Pressable onPress={() => void onLogout()} style={styles.dangerButton}>
              <Text style={styles.dangerButtonText}>{copy.settings.logoutAction}</Text>
            </Pressable>
          </View>
        </View>
      }
    />
  );
}

export function NotificationsCategorySection(props: SettingsSectionProps) {
  const {
    styles,
    copy,
    morningBriefTime,
    areDailyBriefNotificationsEnabled,
    onOpenNotificationSettings,
    onSelectSettingsSection
  } = props;

  const items: CategoryMenuItem[] = [
    {
      title: copy.settings.menuNotifications,
      ok: areDailyBriefNotificationsEnabled,
      meta: areDailyBriefNotificationsEnabled
        ? morningBriefTime ?? "09:00"
        : copy.settings.notificationsDisabled,
      onPress: onOpenNotificationSettings
    }
  ];

  return (
    <CategoryShell
      styles={styles}
      title={copy.settings.catNotificationsTitle}
      subtitle={copy.settings.catNotificationsSubtitle}
      items={items}
      onSelectSettingsSection={onSelectSettingsSection}
    />
  );
}

export function MailCategorySection(props: SettingsSectionProps) {
  const {
    styles,
    copy,
    ignoredSenderRules,
    onOpenIgnoredSenderSettings,
    onOpenUnsubscribeSettings,
    onSelectSettingsSection
  } = props;

  const items: CategoryMenuItem[] = [
    {
      title: copy.settings.ignoredTitle,
      meta: copy.settings.menuIgnored(ignoredSenderRules.length),
      onPress: onOpenIgnoredSenderSettings
    },
    {
      title: copy.settings.menuUnsubscribe,
      meta: copy.settings.unsubscribeSubtitle,
      onPress: onOpenUnsubscribeSettings
    }
  ];

  return (
    <CategoryShell
      styles={styles}
      title={copy.settings.catMailTitle}
      subtitle={copy.settings.catMailSubtitle}
      items={items}
      onSelectSettingsSection={onSelectSettingsSection}
    />
  );
}

export function ContentCategorySection(props: SettingsSectionProps) {
  const {
    styles,
    copy,
    usage,
    language,
    enabledNewsCategories,
    labelCategory,
    isAskFabHidden,
    onOpenUsageSettings,
    onOpenDataPrivacySettings,
    onOpenNewsSettings,
    onToggleAskFabHidden,
    onSelectSettingsSection
  } = props;

  const items: CategoryMenuItem[] = [
    {
      title: copy.settings.menuNewsTopics,
      meta: enabledNewsCategories.map(category => labelCategory(category)).join(", "),
      onPress: onOpenNewsSettings
    },
    {
      title: copy.settings.menuUsage,
      meta: usage
        ? copy.settings.usageOf(usage.counters.briefingsGenerated, usage.limits.dailyOverview)
        : language === "ko"
          ? "확인하기"
          : "View",
      onPress: onOpenUsageSettings
    },
    {
      title: copy.settings.menuDataPrivacy,
      meta: copy.settings.dataPrivacyMenuHint,
      onPress: onOpenDataPrivacySettings
    }
  ];

  return (
    <CategoryShell
      styles={styles}
      title={copy.settings.catContentTitle}
      subtitle={copy.settings.catContentSubtitle}
      items={items}
      onSelectSettingsSection={onSelectSettingsSection}
      footer={
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
      }
    />
  );
}
