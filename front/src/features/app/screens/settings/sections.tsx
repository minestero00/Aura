import React from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import DateTimePicker from "@react-native-community/datetimepicker";
import { SettingsOkBadge, SettingsStatusRow, SettingsSubpageHeader } from "@features/app/screens/settings/shared";
import { NEWS_CATEGORIES, toPickerDate, type SettingsScreenProps } from "@features/app/screens/settings/types";
import { createAppStyles } from "@features/app/styles";

interface SettingsSectionContentProps extends SettingsScreenProps {
  styles: ReturnType<typeof createAppStyles>;
}

export function SettingsSectionContent({
  styles,
  copy,
  gmailAddress,
  gmailConnected,
  gmailConnectedAt,
  enabledNewsCategories,
  ignoredSenderDraft,
  ignoredSenderRules,
  morningBriefTimeDraft,
  isGmailRefreshRequired,
  areDailyBriefNotificationsEnabled,
  isDeviceCalendarPermissionGranted,
  isGoogleCalendarConnected,
  isNotificationPermissionGranted,
  morningBriefTime,
  language,
  labelCategory,
  selectedSettingsSection,
  onConnectGmail,
  onConnectDeviceCalendar,
  onDisconnectGmail,
  onOpenGmailSettings,
  onOpenIgnoredSenderSettings,
  onOpenLanguageSettings,
  onOpenNotificationSettings,
  onOpenPermissionsSettings,
  onOpenNewsSettings,
  onOpenSystemSettings,
  onIgnoredSenderDraftChange,
  onMorningBriefTimeDraftChange,
  onRemoveIgnoredSender,
  onSaveIgnoredSenderDraft,
  onSaveMorningBriefTime,
  onSelectSettingsSection,
  onSetLanguage,
  onDisableDailyBriefNotifications,
  onEnableDailyBriefNotifications,
  onToggleNewsCategory,
  onLogout
}: SettingsSectionContentProps) {
  if (selectedSettingsSection === "gmail") {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.settingsScreen}>
          <SettingsSubpageHeader
            styles={styles}
            title={copy.settings.gmailTitle}
            subtitle={copy.settings.gmailSubtitle}
            onSelectSettingsSection={onSelectSettingsSection}
          />
          <ScrollView contentContainerStyle={styles.scrollContent} style={styles.scrollView}>
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>{copy.settings.currentStatus}</Text>
              <SettingsStatusRow
                styles={styles}
                label={copy.settings.connected}
                isOk={gmailConnected && !isGmailRefreshRequired}
                issueText={isGmailRefreshRequired ? copy.settings.refreshRequired : copy.settings.notConnected}
              />
              <Text style={styles.detailLine}>
                {copy.settings.address}: {gmailAddress ?? copy.settings.notConnected}
              </Text>
              <Text style={styles.detailLine}>
                {copy.settings.connectedAt}: {gmailConnectedAt ?? copy.settings.notConnected}
              </Text>

              {isGmailRefreshRequired ? (
                <View style={styles.warningCard}>
                  <Text style={styles.warningText}>{copy.settings.refreshRequired}</Text>
                  <Text style={styles.helperText}>{copy.settings.refreshHelp}</Text>
                </View>
              ) : null}

              <View style={styles.buttonRow}>
                <Pressable onPress={() => void onConnectGmail()} style={styles.secondaryButton}>
                  <Text style={styles.secondaryButtonText}>
                    {gmailConnected ? copy.settings.refreshGmail : copy.settings.connectGmail}
                  </Text>
                </Pressable>

                {gmailConnected ? (
                  <Pressable onPress={() => void onDisconnectGmail()} style={styles.outlineButton}>
                    <Text style={styles.outlineButtonText}>{copy.settings.disconnectGmail}</Text>
                  </Pressable>
                ) : null}
              </View>
            </View>
          </ScrollView>
        </View>
      </SafeAreaView>
    );
  }

  if (selectedSettingsSection === "ignored-senders") {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.settingsScreen}>
          <SettingsSubpageHeader
            styles={styles}
            title={copy.settings.ignoredTitle}
            subtitle={copy.settings.ignoredSubtitle}
            onSelectSettingsSection={onSelectSettingsSection}
          />
          <ScrollView contentContainerStyle={styles.scrollContent} style={styles.scrollView}>
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>{copy.settings.ignoredManage}</Text>
              <Text style={styles.helperText}>{copy.settings.ignoredHelper}</Text>

              <TextInput
                autoCapitalize="none"
                keyboardType="email-address"
                onChangeText={onIgnoredSenderDraftChange}
                placeholder={copy.settings.ignoredPlaceholder}
                style={styles.textInput}
                value={ignoredSenderDraft}
              />

              <View style={styles.buttonRow}>
                <Pressable onPress={() => void onSaveIgnoredSenderDraft()} style={styles.secondaryButton}>
                  <Text style={styles.secondaryButtonText}>{copy.settings.addIgnored}</Text>
                </Pressable>
              </View>

              {ignoredSenderRules.length === 0 ? (
                <Text style={styles.helperText}>{copy.settings.noIgnored}</Text>
              ) : null}

              {ignoredSenderRules.map(rule => (
                <View key={rule.senderKey} style={styles.settingsRow}>
                  <View style={styles.settingsRowMain}>
                    <Text style={styles.messageSubject}>{rule.label}</Text>
                    <Text style={styles.messageMeta}>{rule.senderKey}</Text>
                  </View>

                  <Pressable
                    onPress={() => void onRemoveIgnoredSender(rule.senderKey)}
                    style={styles.outlineButtonCompact}
                  >
                    <Text style={styles.outlineButtonText}>{copy.settings.remove}</Text>
                  </Pressable>
                </View>
              ))}
            </View>
          </ScrollView>
        </View>
      </SafeAreaView>
    );
  }

  if (selectedSettingsSection === "news") {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.settingsScreen}>
          <SettingsSubpageHeader
            styles={styles}
            title={copy.settings.newsTopicsTitle}
            subtitle={copy.settings.newsTopicsSubtitle}
            onSelectSettingsSection={onSelectSettingsSection}
            meta={
              <View style={styles.subpageMetaRow}>
                <Text style={styles.helperText}>{copy.settings.maxTopicsHelp}</Text>
                <Text style={styles.subpageMetaText}>
                  {copy.settings.selectedTopics(enabledNewsCategories.length)}
                </Text>
              </View>
            }
          />
          <ScrollView contentContainerStyle={styles.chipScrollContent} style={styles.scrollView}>
            {NEWS_CATEGORIES.map(category => {
              const enabled = enabledNewsCategories.includes(category);

              return (
                <Pressable
                  key={category}
                  onPress={() => void onToggleNewsCategory(category)}
                  style={[styles.chipButton, enabled ? styles.chipButtonActive : null]}
                >
                  <Text
                    style={[
                      styles.chipButtonLabel,
                      enabled ? styles.chipButtonLabelActive : null
                    ]}
                  >
                    #{labelCategory(category)}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </SafeAreaView>
    );
  }

  if (selectedSettingsSection === "language") {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.settingsScreen}>
          <SettingsSubpageHeader
            styles={styles}
            title={copy.settings.languageTitle}
            subtitle={copy.settings.languageSubtitle}
            onSelectSettingsSection={onSelectSettingsSection}
          />
          <ScrollView contentContainerStyle={styles.scrollContent} style={styles.scrollView}>
            <View style={styles.sectionCard}>
              <Pressable onPress={() => void onSetLanguage("en")} style={styles.settingsRow}>
                <View style={styles.settingsRowMain}>
                  <Text style={styles.messageSubject}>{copy.settings.languageEnglish}</Text>
                </View>
                {language === "en" ? <SettingsOkBadge styles={styles} /> : <Text style={styles.toggleDisabledText}>-</Text>}
              </Pressable>

              <Pressable onPress={() => void onSetLanguage("ko")} style={styles.settingsRow}>
                <View style={styles.settingsRowMain}>
                  <Text style={styles.messageSubject}>{copy.settings.languageKorean}</Text>
                </View>
                {language === "ko" ? <SettingsOkBadge styles={styles} /> : <Text style={styles.toggleDisabledText}>-</Text>}
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </SafeAreaView>
    );
  }

  if (selectedSettingsSection === "notifications") {
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
              />
              <SettingsStatusRow
                styles={styles}
                label={copy.settings.notificationsPermission}
                isOk={isNotificationPermissionGranted}
                issueText={copy.settings.notificationsBlocked}
              />
              <Text style={styles.detailLine}>
                {copy.settings.notificationsTime}: {morningBriefTime ?? "09:00"}
              </Text>

              <View style={styles.sectionCard}>
                <DateTimePicker
                  display="spinner"
                  mode="time"
                  onChange={(_, selectedDate) => {
                    if (!selectedDate) {
                      return;
                    }

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

                <Pressable
                  onPress={() => void onSaveMorningBriefTime()}
                  style={styles.outlineButton}
                >
                  <Text style={styles.outlineButtonText}>{copy.settings.notificationsRefresh}</Text>
                </Pressable>
              </View>
            </View>
          </ScrollView>
        </View>
      </SafeAreaView>
    );
  }

  if (selectedSettingsSection === "permissions") {
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

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent} style={styles.scrollView}>
        <View style={styles.heroCard}>
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
