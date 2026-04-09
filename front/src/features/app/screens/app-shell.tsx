import React from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, View } from "react-native";
import { MailScreen } from "@features/app/screens/mail-screen";
import { NewsScreen } from "@features/app/screens/news-screen";
import { SettingsScreen } from "@features/app/screens/settings-screen";
import { TodoScreen } from "@features/app/screens/todo-screen";
import { createAppStyles, useAuraTheme } from "@features/app/styles";
import type { UseAuraAppResult } from "@features/app/types";

interface AppShellProps {
  app: UseAuraAppResult;
}

export function AppShell({ app }: AppShellProps) {
  const gmail = app.authState!.me.integrations;
  const theme = useAuraTheme();
  const styles = createAppStyles(theme);

  return (
    <View style={styles.appShell}>
      <Modal
        animationType="fade"
        transparent
        visible={app.isDailyBriefModalVisible}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <ScrollView contentContainerStyle={styles.modalScrollContent}>
              <View style={styles.modalHeaderRow}>
                <Text style={styles.sectionTitle}>{app.copy.mail.dailyBriefTitle}</Text>
                <Pressable
                  onPress={app.handleCloseDailyBriefModal}
                  style={styles.modalCloseButton}
                >
                  <Text style={styles.modalCloseText}>×</Text>
                </Pressable>
              </View>
              <Text style={styles.helperText}>{app.copy.mail.dailyBriefSubtitle}</Text>

              {app.isDailyBriefPreparing ? (
                <View style={styles.modalLoadingWrap}>
                  <ActivityIndicator color={theme.colors.textPrimary} />
                  <Text style={styles.inlineLoadingText}>{app.copy.mail.dailyBriefPreparing}</Text>
                </View>
              ) : null}

              {!app.isDailyBriefPreparing && app.dailyEmailDigest ? (
                <View style={styles.compactDigestCard}>
                  <Text style={styles.digestLabel}>{app.copy.mail.dailyBriefEmailLabel}</Text>
                  <Text style={styles.compactDigestHeadline}>{app.dailyEmailDigest.headline}</Text>
                  {app.dailyEmailDigest.bullets.map((bullet, index) => (
                    <Text key={`modal-email-${index}`} style={styles.digestBullet}>
                      • {bullet}
                    </Text>
                  ))}
                </View>
              ) : null}

              {!app.isDailyBriefPreparing && app.newsBriefing ? (
                <View style={styles.compactDigestCard}>
                  <Text style={styles.digestLabel}>{app.copy.mail.dailyBriefNewsLabel}</Text>
                  <Text style={styles.compactDigestHeadline}>{app.newsBriefing.headline}</Text>
                  {app.newsBriefing.bullets.map((bullet, index) => (
                    <Text key={`modal-news-${index}`} style={styles.digestBullet}>
                      • {bullet}
                    </Text>
                  ))}
                </View>
              ) : null}

              {!app.isDailyBriefPreparing && !app.dailyEmailDigest && !app.newsBriefing ? (
                <Text style={styles.helperText}>{app.copy.mail.dailyBriefEmpty}</Text>
              ) : null}

              <View style={styles.modalActionRow}>
                <Pressable
                  onPress={() => void app.handleRefreshDailyBrief()}
                  style={[styles.modalActionButton, styles.modalActionButtonPrimary]}
                >
                  <Text style={[styles.modalActionButtonText, styles.modalActionButtonTextPrimary]}>
                    {app.copy.mail.dailyBriefRefresh}
                  </Text>
                </Pressable>

                <Pressable
                  onPress={app.handleOpenMailFromDailyBrief}
                  style={styles.modalActionButton}
                >
                  <Text style={styles.modalActionButtonText}>{app.copy.mail.dailyBriefOpenMail}</Text>
                </Pressable>

                <Pressable
                  onPress={app.handleOpenNewsFromDailyBrief}
                  style={styles.modalActionButton}
                >
                  <Text style={styles.modalActionButtonText}>{app.copy.mail.dailyBriefOpenNews}</Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <View style={styles.appShellContent}>
        {app.selectedTab === "mail" ? (
          <MailScreen
            copy={app.copy}
            dailyEmailDigest={app.dailyEmailDigest}
            dailyEmailMessages={app.dailyEmailMessages}
            errorMessage={app.errorMessage}
            gmailConnected={gmail.gmailConnected}
            gmailDigest={app.gmailDigest}
            gmailMessages={app.gmailMessages}
            isInboxLoading={app.isInboxLoading}
            onOpenIgnoredSenderSettings={app.handleOpenIgnoredSenderSettings}
            onLoadDailyEmailBrief={app.handleLoadDailyEmailBrief}
            onLoadEmailSummary={app.handleLoadEmailSummary}
            onLoadRecentEmails={app.handleLoadRecentEmails}
            onReplyToMessage={app.handleReplyToMessage}
            replyingMessageId={app.replyingMessageId}
          />
        ) : null}

        {app.selectedTab === "news" ? (
          <NewsScreen
            copy={app.copy}
            enabledCategories={app.enabledNewsCategories}
            isNewsLoading={app.isNewsLoading}
            labelCategory={app.labelNewsCategory}
            newsArticles={app.newsArticles}
            newsBriefing={app.newsBriefing}
            onLoadDailyNewsBrief={app.handleLoadDailyNewsBrief}
          />
        ) : null}

        {app.selectedTab === "todo" ? (
          <TodoScreen
            calendarAgendaDays={app.calendarAgendaDays}
            calendarTravelHints={app.calendarTravelHints}
            calendarConnected={app.authState!.me.integrations.calendarConnected}
            copy={app.copy}
            deviceCalendarAgendaDays={app.deviceCalendarAgendaDays}
            isCalendarLoading={app.isCalendarLoading}
            isCalendarTravelLoading={app.isCalendarTravelLoading}
            isDeviceCalendarLoading={app.isDeviceCalendarLoading}
            isDeviceCalendarPermissionGranted={app.isDeviceCalendarPermissionGranted}
            selectedTravelMode={app.selectedTravelMode}
            onConnectDeviceCalendar={app.handleConnectDeviceCalendar}
            onConnectCalendar={app.handleConnectGmail}
            onSetTravelMode={app.handleSetTravelMode}
            onLoadDeviceCalendarAgenda={app.handleLoadDeviceCalendarAgenda}
            onLoadCalendarAgenda={app.handleLoadCalendarAgenda}
          />
        ) : null}

        {app.selectedTab === "settings" ? (
          <SettingsScreen
            areDailyBriefNotificationsEnabled={app.areDailyBriefNotificationsEnabled}
            copy={app.copy}
            gmailAddress={gmail.gmailAddress}
            gmailConnected={gmail.gmailConnected}
            gmailConnectedAt={gmail.gmailConnectedAt}
            enabledNewsCategories={app.enabledNewsCategories}
            ignoredSenderDraft={app.ignoredSenderDraft}
            ignoredSenderRules={app.ignoredSenderRules}
            morningBriefTimeDraft={app.morningBriefTimeDraft}
            isGmailRefreshRequired={app.isGmailRefreshRequired}
            isDeviceCalendarPermissionGranted={app.isDeviceCalendarPermissionGranted}
            isGoogleCalendarConnected={app.authState!.me.integrations.calendarConnected}
            isNotificationPermissionGranted={app.isNotificationPermissionGranted}
            language={app.language}
            labelCategory={app.labelNewsCategory}
            morningBriefTime={app.authState!.me.preferences.morningBriefTime}
            selectedSettingsSection={app.selectedSettingsSection}
            onConnectGmail={app.handleConnectGmail}
            onConnectDeviceCalendar={app.handleConnectDeviceCalendar}
            onDisableDailyBriefNotifications={app.handleDisableDailyBriefNotifications}
            onDisconnectGmail={app.handleDisconnectGmail}
            onEnableDailyBriefNotifications={app.handleEnableDailyBriefNotifications}
            onOpenGmailSettings={app.handleOpenGmailSettings}
            onOpenIgnoredSenderSettings={() => app.handleOpenIgnoredSenderSettings()}
            onOpenLanguageSettings={app.handleOpenLanguageSettings}
            onOpenNotificationSettings={app.handleOpenNotificationSettings}
            onOpenPermissionsSettings={app.handleOpenPermissionsSettings}
            onOpenNewsSettings={app.handleOpenNewsSettings}
            onOpenSystemSettings={app.handleOpenSystemSettings}
            onIgnoredSenderDraftChange={app.handleIgnoredSenderDraftChange}
            onMorningBriefTimeDraftChange={app.handleMorningBriefTimeDraftChange}
            onRemoveIgnoredSender={app.handleRemoveIgnoredSender}
            onSaveIgnoredSenderDraft={app.handleSaveIgnoredSenderDraft}
            onSaveMorningBriefTime={app.handleSaveMorningBriefTime}
            onLogout={app.handleLogout}
            onSetLanguage={app.handleSetLanguage}
            onSelectSettingsSection={app.handleSelectSettingsSection}
            onToggleNewsCategory={app.handleToggleNewsCategory}
          />
        ) : null}
      </View>

      <View style={styles.bottomNav}>
        <Pressable
          onPress={() => app.handleSelectTab("mail")}
          style={styles.bottomNavItem}
        >
          <Text
            style={[styles.bottomNavLabel, app.selectedTab === "mail" ? styles.bottomNavLabelActive : null]}
          >
            {app.copy.tabs.mail}
          </Text>
        </Pressable>

        <Pressable
          onPress={() => app.handleSelectTab("todo")}
          style={styles.bottomNavItem}
        >
          <Text
            style={[styles.bottomNavLabel, app.selectedTab === "todo" ? styles.bottomNavLabelActive : null]}
          >
            {app.copy.tabs.todo}
          </Text>
        </Pressable>

        <Pressable
          onPress={() => app.handleSelectTab("news")}
          style={styles.bottomNavItem}
        >
          <Text
            style={[styles.bottomNavLabel, app.selectedTab === "news" ? styles.bottomNavLabelActive : null]}
          >
            {app.copy.tabs.news}
          </Text>
        </Pressable>

        <Pressable
          onPress={() => app.handleSelectTab("settings")}
          style={styles.bottomNavItem}
        >
          <Text
            style={[
              styles.bottomNavLabel,
              app.selectedTab === "settings" ? styles.bottomNavLabelActive : null
            ]}
          >
            {app.copy.tabs.settings}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
