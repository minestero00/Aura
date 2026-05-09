import React, { useEffect, useRef, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent
} from "react-native";
import LinearGradient from "react-native-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
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
import { ChatFab } from "@features/app/components/chat-fab";
import { NavExpandDrawer } from "@features/app/components/nav-expand-drawer";
import { NavExpandCoachmark } from "@features/app/components/nav-expand-coachmark";
import { loadNavExpandHintSeen, markNavExpandHintSeen } from "@features/app/storage";

interface AppShellProps {
  app: UseAuraAppResult;
}

// Ask는 별도 modal(우측 상단 ChatFab)로 분리. bottom nav는 4탭만.
// AppTabKey union에는 "ask"가 남아있지만 selectedTab은 이 4개만 set된다.
const TAB_ORDER: AppTabKey[] = ["mail", "todo", "news", "settings"];

export function AppShell({ app }: AppShellProps) {
  const gmail = app.authState!.me.integrations;
  const theme = useAuraTheme();
  const styles = createAppStyles(theme);
  const { width: screenWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const tabIndex = Math.max(0, TAB_ORDER.indexOf(app.selectedTab));

  // 첫 로그인 후 BottomNav handle 위에 안내 말풍선 1회. ×로 닫으면 storage에
  // 마킹 → 다음 launch부터 안 뜸. 자동 로그인은 storage 기준이라 자연스레 skip.
  const [showNavExpandCoachmark, setShowNavExpandCoachmark] = useState(false);
  useEffect(() => {
    let cancelled = false;
    void loadNavExpandHintSeen().then(seen => {
      if (!cancelled && !seen) setShowNavExpandCoachmark(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  function dismissNavExpandCoachmark() {
    setShowNavExpandCoachmark(false);
    void markNavExpandHintSeen().catch(() => undefined);
  }

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
    { key: "settings", label: app.copy.tabs.settings }
  ];

  // 사용자가 SignIn 톤이 깔끔하다고 피드백 → 5탭 전체에 동일 그라디언트 +
  // 흰 카드 패턴. status bar/notch까지 이어지는 보라/시안 그라디언트.
  // (이전 1단계의 그라디언트 제거를 revert. 단 카드/버튼/sub-card 정돈 패턴은 유지.)
  const heroGradient = theme.isDark
    ? ["#8E76FF", "#6B5BFF", "#34D2FF"]
    : ["#6B5BFF", "#8E76FF", "#34D2FF"];

  return (
    <View style={styles.appShell}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
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
        // 설정 sub-section(권한/Gmail/뉴스 등)에서는 가로 스와이프를 비활성화.
        // sub-section은 stack 안의 detail page라 좌우 swipe로 옆 탭에 가버리면
        // 사용자가 의도치 않게 다른 화면으로 튕겨나간다(피드백 받음).
        // sub-section의 "← 설정으로 돌아가기" 링크로만 뒤로 가도록.
        scrollEnabled={
          !(app.selectedTab === "settings" && app.selectedSettingsSection !== "menu")
        }
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
            language={app.language}
            enabledCategories={app.enabledNewsCategories}
            isNewsLoading={app.isNewsLoading}
            labelCategory={app.labelNewsCategory}
            newsArticles={app.newsArticles}
            newsBriefing={app.newsBriefing}
            onLoadDailyNewsBrief={app.handleLoadDailyNewsBrief}
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
            isAskFabHidden={app.isAskFabHidden}
            onToggleAskFabHidden={app.handleToggleAskFabHidden}
          />
        </View>
      </ScrollView>

      <BottomNav
        navItems={navItems}
        onSelectTab={app.handleSelectTab}
        selectedTab={app.selectedTab}
        theme={theme}
        onPullUp={app.handleOpenNavExpand}
      />

      <ChatFab onPress={app.handleOpenAsk} hidden={app.isAskFabHidden} />

      <NavExpandDrawer
        visible={app.isNavExpanded}
        copy={app.copy}
        onDismiss={app.handleCloseNavExpand}
        onOpenAsk={app.handleOpenAsk}
      />

      <NavExpandCoachmark
        visible={showNavExpandCoachmark && !app.isNavExpanded}
        copy={app.copy}
        bottomOffset={insets.bottom + 92}
        onDismiss={dismissNavExpandCoachmark}
      />

      <Modal
        visible={app.isAskOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={app.handleCloseAsk}
      >
        <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={app.copy.common.close}
            onPress={app.handleCloseAsk}
            style={[askCloseStyles.button, { top: insets.top + 12 }, {
              backgroundColor: theme.colors.surfaceMuted,
              borderColor: theme.colors.line
            }]}
          >
            <Text style={[askCloseStyles.label, { color: theme.colors.textSecondary }]}>×</Text>
          </Pressable>
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
      </Modal>
    </View>
  );
}

const askCloseStyles = StyleSheet.create({
  button: {
    position: "absolute",
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    zIndex: 50
  },
  label: { fontSize: 22, fontWeight: "700", lineHeight: 24 }
});
