import React from "react";
import { View } from "react-native";
import { MailScreen } from "@features/app/screens/mail-screen";
import { NewsScreen } from "@features/app/screens/news-screen";
import { SettingsScreen } from "@features/app/screens/settings-screen";
import { TodoScreen } from "@features/app/screens/todo-screen";
import { AskScreen } from "@features/app/screens/ask-screen";
import { createAppStyles, useAuraTheme } from "@features/app/styles";
import type { UseAuraAppResult } from "@features/app/types";
import { BottomNav } from "@features/app/screens/app-shell/bottom-nav";
import { DailyBriefModal } from "@features/app/screens/app-shell/daily-brief-modal";

interface AppShellProps {
  app: UseAuraAppResult;
}

export function AppShell({ app }: AppShellProps) {
  const gmail = app.authState!.me.integrations;
  const theme = useAuraTheme();
  const styles = createAppStyles(theme);
  const navItems: Array<{ key: "mail" | "todo" | "news" | "ask" | "settings"; label: string; icon: string }> = [
    { key: "mail", label: app.copy.tabs.mail, icon: "✉︎" },
    { key: "todo", label: app.copy.tabs.todo, icon: "◷" },
    { key: "news", label: app.copy.tabs.news, icon: "☰" },
    { key: "ask", label: app.copy.tabs.ask, icon: "◉" },
    { key: "settings", label: app.copy.tabs.settings, icon: "⚙︎" }
  ];

  return (
    <View style={styles.appShell}>
      <DailyBriefModal app={app} theme={theme} />

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
            isWeatherLoading={app.isWeatherLoading}
            selectedTravelMode={app.selectedTravelMode}
            todayWeatherAdvice={app.todayWeatherAdvice}
            onConnectDeviceCalendar={app.handleConnectDeviceCalendar}
            onConnectCalendar={app.handleConnectGmail}
            onSetTravelMode={app.handleSetTravelMode}
            onLoadTodayWeatherAdvice={app.handleLoadTodayWeatherAdvice}
            onLoadDeviceCalendarAgenda={app.handleLoadDeviceCalendarAgenda}
            onLoadCalendarAgenda={app.handleLoadCalendarAgenda}
          />
        ) : null}

        {app.selectedTab === "settings" ? (
          <SettingsScreen
            areDailyBriefNotificationsEnabled={app.areDailyBriefNotificationsEnabled}
            copy={app.copy}
            noticeMessage={app.settingsNoticeMessage}
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
            usage={app.usage}
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
            onOpenUsageSettings={app.handleOpenUsageSettings}
            onOpenDataPrivacySettings={app.handleOpenDataPrivacySettings}
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

        {app.selectedTab === "ask" ? (
          <AskScreen
            chatInputDraft={app.chatInputDraft}
            chatMessages={app.chatMessages}
            copy={app.copy}
            currentUserName={app.authState?.me.user.name ?? null}
            dailyEmailMessages={app.dailyEmailMessages}
            errorMessage={app.errorMessage}
            isChatLoading={app.isChatLoading}
            onChatInputChange={app.handleChatInputDraftChange}
            onSendChatMessage={app.handleSendChatMessage}
          />
        ) : null}
      </View>

      <BottomNav
        navItems={navItems}
        onSelectTab={app.handleSelectTab}
        selectedTab={app.selectedTab}
        theme={theme}
      />
    </View>
  );
}
