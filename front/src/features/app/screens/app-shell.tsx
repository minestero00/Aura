import React, { useEffect, useRef } from "react";
import {
  ScrollView,
  StatusBar,
  StyleSheet,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent
} from "react-native";
import LinearGradient from "react-native-linear-gradient";
import { MailScreen } from "@features/app/screens/mail-screen";
import { NewsScreen } from "@features/app/screens/news-screen";
import { SettingsScreen } from "@features/app/screens/settings-screen";
import { TodoScreen } from "@features/app/screens/todo-screen";
import { AskScreen } from "@features/app/screens/ask-screen";
import { createAppStyles, useAuraTheme } from "@features/app/styles";
import type { AppTabKey, UseAuraAppResult } from "@features/app/types";
import { BottomNav } from "@features/app/screens/app-shell/bottom-nav";
import { DailyBriefModal } from "@features/app/screens/app-shell/daily-brief-modal";
import { ActionAlertModal } from "@features/app/components/action-alert-modal";

interface AppShellProps {
  app: UseAuraAppResult;
}

const TAB_ORDER: AppTabKey[] = ["mail", "todo", "news", "ask", "settings"];

export function AppShell({ app }: AppShellProps) {
  const gmail = app.authState!.me.integrations;
  const theme = useAuraTheme();
  const styles = createAppStyles(theme);
  const { width: screenWidth } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const tabIndex = Math.max(0, TAB_ORDER.indexOf(app.selectedTab));

  // BottomNav 탭 누르면 selectedTab → useEffect에서 ScrollView 동기화.
  // 스와이프로 탭 바뀌면 onMomentumScrollEnd → handleSelectTab 호출 (handleSelectTab
  // 안에서 selectedTab 다시 set하지만 useEffect는 같은 인덱스라 no-op).
  useEffect(() => {
    scrollRef.current?.scrollTo({ x: tabIndex * screenWidth, animated: true });
  }, [tabIndex, screenWidth]);

  function handleScrollEnd(event: NativeSyntheticEvent<NativeScrollEvent>) {
    if (screenWidth <= 0) return;
    const newIndex = Math.round(event.nativeEvent.contentOffset.x / screenWidth);
    const newTab = TAB_ORDER[newIndex];
    if (newTab && newTab !== app.selectedTab) {
      app.handleSelectTab(newTab);
    }
  }

  const navItems: Array<{ key: AppTabKey; label: string }> = [
    { key: "mail", label: app.copy.tabs.mail },
    { key: "todo", label: app.copy.tabs.todo },
    { key: "news", label: app.copy.tabs.news },
    { key: "ask", label: app.copy.tabs.ask },
    { key: "settings", label: app.copy.tabs.settings }
  ];

  // SignIn과 동일한 보라/시안 그라디언트를 5탭 전체에 깐다. status bar/notch
  // 영역까지 같은 톤이 흘러서 화면 간 전환 시 색이 끊기지 않는다. 각 화면은
  // SafeAreaView를 transparent(styles.safeArea)로 두어 그라디언트가 비치고
  // hero 텍스트는 흰색 톤(eyebrowOnGradient/titleOnGradient/subtitleOnGradient)
  // 그대로 사용. 콘텐츠 sectionCard만 흰 카드로 떠서 가독성 유지.
  const heroGradient = theme.isDark
    ? ["#8E76FF", "#6B5BFF", "#34D2FF"]
    : ["#6B5BFF", "#8E76FF", "#34D2FF"];

  return (
    <View style={styles.appShell}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent
      />
      <LinearGradient
        colors={heroGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        locations={[0, 0.55, 1]}
        style={StyleSheet.absoluteFillObject}
      />
      <DailyBriefModal app={app} theme={theme} />
      <ActionAlertModal
        copy={app.copy}
        error={app.actionableError}
        onPrimary={app.handleActionableErrorPrimary}
        onDismiss={app.handleDismissActionableError}
      />

      <ScrollView
        ref={scrollRef}
        style={styles.appShellContent}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScrollEnd}
        keyboardShouldPersistTaps="handled"
        contentOffset={{ x: tabIndex * screenWidth, y: 0 }}
      >
        <View style={{ width: screenWidth }}>
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
        </View>

        <View style={{ width: screenWidth }}>
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
        </View>

        <View style={{ width: screenWidth }}>
          <NewsScreen
            copy={app.copy}
            enabledCategories={app.enabledNewsCategories}
            isNewsLoading={app.isNewsLoading}
            labelCategory={app.labelNewsCategory}
            newsArticles={app.newsArticles}
            newsBriefing={app.newsBriefing}
            onLoadDailyNewsBrief={app.handleLoadDailyNewsBrief}
          />
        </View>

        <View style={{ width: screenWidth }}>
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
        </View>

        <View style={{ width: screenWidth }}>
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
        </View>
      </ScrollView>

      <BottomNav
        navItems={navItems}
        onSelectTab={app.handleSelectTab}
        selectedTab={app.selectedTab}
        theme={theme}
      />
    </View>
  );
}
