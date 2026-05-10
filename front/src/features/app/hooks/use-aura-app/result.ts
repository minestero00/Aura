import { filterIgnoredMessages } from "@features/gmail/filtering";
import { getCategoryLabel, type AppCopy, type AppLanguage } from "@features/app/i18n";
import type { UseAuraAppResult } from "@features/app/types";

interface BuildResultParams {
  authState: UseAuraAppResult["authState"];
  areDailyBriefNotificationsEnabled: UseAuraAppResult["areDailyBriefNotificationsEnabled"];
  calendarAgendaDays: UseAuraAppResult["calendarAgendaDays"];
  calendarTravelHintsByMode: { transit: UseAuraAppResult["calendarTravelHints"]; driving: UseAuraAppResult["calendarTravelHints"] };
  copy: AppCopy;
  chatInputDraft: UseAuraAppResult["chatInputDraft"];
  setChatInputDraft: (value: string) => void;
  chatMessages: UseAuraAppResult["chatMessages"];
  dailyEmailDigest: UseAuraAppResult["dailyEmailDigest"];
  dailyEmailMessages: UseAuraAppResult["dailyEmailMessages"];
  deviceCalendarAgendaDays: UseAuraAppResult["deviceCalendarAgendaDays"];
  enabledNewsCategories: UseAuraAppResult["enabledNewsCategories"];
  errorMessage: UseAuraAppResult["errorMessage"];
  actionableError: UseAuraAppResult["actionableError"];
  settingsNoticeMessage: UseAuraAppResult["settingsNoticeMessage"];
  language: AppLanguage;
  gmailDebugState: UseAuraAppResult["gmailDebugState"];
  replyingMessageId: UseAuraAppResult["replyingMessageId"];
  ignoredSenderRules: UseAuraAppResult["ignoredSenderRules"];
  ignoredSenderDraft: UseAuraAppResult["ignoredSenderDraft"];
  setIgnoredSenderDraft: (value: string) => void;
  morningBriefTimeDraft: UseAuraAppResult["morningBriefTimeDraft"];
  setMorningBriefTimeDraft: (value: string) => void;
  isBootstrapping: UseAuraAppResult["isBootstrapping"];
  isChatLoading: UseAuraAppResult["isChatLoading"];
  isCalendarLoading: UseAuraAppResult["isCalendarLoading"];
  isCalendarTravelLoading: UseAuraAppResult["isCalendarTravelLoading"];
  isDailyBriefPreparing: UseAuraAppResult["isDailyBriefPreparing"];
  isDailyBriefModalVisible: UseAuraAppResult["isDailyBriefModalVisible"];
  setIsDailyBriefModalVisible: (value: boolean) => void;
  isAskOpen: UseAuraAppResult["isAskOpen"];
  isAskFabHidden: UseAuraAppResult["isAskFabHidden"];
  isNavExpanded: UseAuraAppResult["isNavExpanded"];
  isTransitOpen: UseAuraAppResult["isTransitOpen"];
  isDeviceCalendarLoading: UseAuraAppResult["isDeviceCalendarLoading"];
  isDeviceCalendarPermissionGranted: UseAuraAppResult["isDeviceCalendarPermissionGranted"];
  isGmailSubmitting: UseAuraAppResult["isGmailSubmitting"];
  isInboxLoading: UseAuraAppResult["isInboxLoading"];
  isNewsLoading: UseAuraAppResult["isNewsLoading"];
  isWeatherLoading: UseAuraAppResult["isWeatherLoading"];
  isSubmitting: UseAuraAppResult["isSubmitting"];
  isNotificationPermissionGranted: UseAuraAppResult["isNotificationPermissionGranted"];
  newsArticles: UseAuraAppResult["newsArticles"];
  newsBriefing: UseAuraAppResult["newsBriefing"];
  todayWeatherAdvice: UseAuraAppResult["todayWeatherAdvice"];
  usage: UseAuraAppResult["usage"];
  selectedTab: UseAuraAppResult["selectedTab"];
  setSelectedTab: (tab: UseAuraAppResult["selectedTab"]) => void;
  selectedSettingsSection: UseAuraAppResult["selectedSettingsSection"];
  setSelectedSettingsSection: (section: UseAuraAppResult["selectedSettingsSection"]) => void;
  selectedTravelMode: UseAuraAppResult["selectedTravelMode"];
  isGmailRefreshRequired: boolean;
  handlers: {
    handleConnectDeviceCalendar: UseAuraAppResult["handleConnectDeviceCalendar"];
    handleConnectGmail: UseAuraAppResult["handleConnectGmail"];
    handleDisconnectGmail: UseAuraAppResult["handleDisconnectGmail"];
    handleIgnoreSender: UseAuraAppResult["handleIgnoreSender"];
    handleOpenSystemSettings: UseAuraAppResult["handleOpenSystemSettings"];
    handleDisableDailyBriefNotifications: UseAuraAppResult["handleDisableDailyBriefNotifications"];
    handleEnableDailyBriefNotifications: UseAuraAppResult["handleEnableDailyBriefNotifications"];
    handleRemoveIgnoredSender: UseAuraAppResult["handleRemoveIgnoredSender"];
    handleLoadDailyEmailBrief: UseAuraAppResult["handleLoadDailyEmailBrief"];
    handleLoadCalendarAgenda: UseAuraAppResult["handleLoadCalendarAgenda"];
    handleLoadDeviceCalendarAgenda: UseAuraAppResult["handleLoadDeviceCalendarAgenda"];
    handleLoadTodayWeatherAdvice: UseAuraAppResult["handleLoadTodayWeatherAdvice"];
    handleLoadDailyNewsBrief: UseAuraAppResult["handleLoadDailyNewsBrief"];
    handleSendChatMessage: UseAuraAppResult["handleSendChatMessage"];
    handleReset: UseAuraAppResult["handleReset"];
    handleRefreshDailyBrief: UseAuraAppResult["handleRefreshDailyBrief"];
    handleGoogleSignIn: UseAuraAppResult["handleGoogleSignIn"];
    handleKakaoSignIn: UseAuraAppResult["handleKakaoSignIn"];
    handlePhoneRequestOtp: UseAuraAppResult["handlePhoneRequestOtp"];
    handlePhoneVerifyOtp: UseAuraAppResult["handlePhoneVerifyOtp"];
    handleEmailSignIn: UseAuraAppResult["handleEmailSignIn"];
    handleReplyToMessage: UseAuraAppResult["handleReplyToMessage"];
    handleSaveIgnoredSenderDraft: UseAuraAppResult["handleSaveIgnoredSenderDraft"];
    handleSaveMorningBriefTime: UseAuraAppResult["handleSaveMorningBriefTime"];
    handleSetLanguage: UseAuraAppResult["handleSetLanguage"];
    handleToggleNewsCategory: UseAuraAppResult["handleToggleNewsCategory"];
    handleSetTravelMode: UseAuraAppResult["handleSetTravelMode"];
    handleActionableErrorPrimary: UseAuraAppResult["handleActionableErrorPrimary"];
    handleDismissActionableError: UseAuraAppResult["handleDismissActionableError"];
    handleOpenAsk: UseAuraAppResult["handleOpenAsk"];
    handleCloseAsk: UseAuraAppResult["handleCloseAsk"];
    handleToggleAskFabHidden: UseAuraAppResult["handleToggleAskFabHidden"];
    handleOpenNavExpand: UseAuraAppResult["handleOpenNavExpand"];
    handleCloseNavExpand: UseAuraAppResult["handleCloseNavExpand"];
    handleOpenTransit: UseAuraAppResult["handleOpenTransit"];
    handleCloseTransit: UseAuraAppResult["handleCloseTransit"];
  };
  openHandlers: {
    handleOpenGmailSettings: UseAuraAppResult["handleOpenGmailSettings"];
    handleOpenIgnoredSenderSettings: UseAuraAppResult["handleOpenIgnoredSenderSettings"];
    handleOpenLanguageSettings: UseAuraAppResult["handleOpenLanguageSettings"];
    handleOpenNotificationSettings: UseAuraAppResult["handleOpenNotificationSettings"];
    handleOpenPermissionsSettings: UseAuraAppResult["handleOpenPermissionsSettings"];
    handleOpenUsageSettings: UseAuraAppResult["handleOpenUsageSettings"];
    handleOpenDataPrivacySettings: UseAuraAppResult["handleOpenDataPrivacySettings"];
    handleOpenNewsSettings: UseAuraAppResult["handleOpenNewsSettings"];
  };
}

export function buildAuraAppResult(params: BuildResultParams): UseAuraAppResult {
  const visibleDailyEmailMessages = filterIgnoredMessages(params.dailyEmailMessages, params.ignoredSenderRules);
  const calendarTravelHints = params.calendarTravelHintsByMode[params.selectedTravelMode] ?? [];

  return {
    authState: params.authState,
    areDailyBriefNotificationsEnabled: params.areDailyBriefNotificationsEnabled,
    calendarAgendaDays: params.calendarAgendaDays,
    calendarTravelHints,
    copy: params.copy,
    chatInputDraft: params.chatInputDraft,
    chatMessages: params.chatMessages,
    dailyEmailDigest: params.dailyEmailDigest,
    dailyEmailMessages: visibleDailyEmailMessages,
    deviceCalendarAgendaDays: params.deviceCalendarAgendaDays,
    enabledNewsCategories: params.enabledNewsCategories,
    errorMessage: params.errorMessage,
    actionableError: params.actionableError,
    settingsNoticeMessage: params.settingsNoticeMessage,
    language: params.language,
    gmailDebugState: params.gmailDebugState,
    replyingMessageId: params.replyingMessageId,
    ignoredSenderRules: params.ignoredSenderRules,
    ignoredSenderDraft: params.ignoredSenderDraft,
    morningBriefTimeDraft: params.morningBriefTimeDraft,
    isBootstrapping: params.isBootstrapping,
    isChatLoading: params.isChatLoading,
    isCalendarLoading: params.isCalendarLoading,
    isCalendarTravelLoading: params.isCalendarTravelLoading,
    isDailyBriefPreparing: params.isDailyBriefPreparing,
    isDailyBriefModalVisible: params.isDailyBriefModalVisible,
    isAskOpen: params.isAskOpen,
    isAskFabHidden: params.isAskFabHidden,
    isNavExpanded: params.isNavExpanded,
    isTransitOpen: params.isTransitOpen,
    isDeviceCalendarLoading: params.isDeviceCalendarLoading,
    isDeviceCalendarPermissionGranted: params.isDeviceCalendarPermissionGranted,
    isGmailSubmitting: params.isGmailSubmitting,
    isInboxLoading: params.isInboxLoading,
    isNewsLoading: params.isNewsLoading,
    isWeatherLoading: params.isWeatherLoading,
    isSubmitting: params.isSubmitting,
    isGmailRefreshRequired: params.isGmailRefreshRequired,
    isNotificationPermissionGranted: params.isNotificationPermissionGranted,
    newsArticles: params.newsArticles,
    newsBriefing: params.newsBriefing,
    todayWeatherAdvice: params.todayWeatherAdvice,
    usage: params.usage,
    selectedTab: params.selectedTab,
    selectedSettingsSection: params.selectedSettingsSection,
    selectedTravelMode: params.selectedTravelMode,
    handleConnectDeviceCalendar: params.handlers.handleConnectDeviceCalendar,
    handleConnectGmail: params.handlers.handleConnectGmail,
    handleCloseDailyBriefModal: () => params.setIsDailyBriefModalVisible(false),
    handleDisconnectGmail: params.handlers.handleDisconnectGmail,
    handleIgnoredSenderDraftChange: params.setIgnoredSenderDraft,
    handleMorningBriefTimeDraftChange: params.setMorningBriefTimeDraft,
    handleIgnoreSender: params.handlers.handleIgnoreSender,
    handleOpenGmailSettings: params.openHandlers.handleOpenGmailSettings,
    handleOpenIgnoredSenderSettings: params.openHandlers.handleOpenIgnoredSenderSettings,
    handleOpenLanguageSettings: params.openHandlers.handleOpenLanguageSettings,
    handleOpenNotificationSettings: params.openHandlers.handleOpenNotificationSettings,
    handleOpenPermissionsSettings: params.openHandlers.handleOpenPermissionsSettings,
    handleOpenUsageSettings: params.openHandlers.handleOpenUsageSettings,
    handleOpenDataPrivacySettings: params.openHandlers.handleOpenDataPrivacySettings,
    handleOpenNewsSettings: params.openHandlers.handleOpenNewsSettings,
    handleOpenSystemSettings: params.handlers.handleOpenSystemSettings,
    handleDisableDailyBriefNotifications: params.handlers.handleDisableDailyBriefNotifications,
    handleEnableDailyBriefNotifications: params.handlers.handleEnableDailyBriefNotifications,
    handleSetTravelMode: params.handlers.handleSetTravelMode,
    handleRemoveIgnoredSender: params.handlers.handleRemoveIgnoredSender,
    handleLoadDailyEmailBrief: params.handlers.handleLoadDailyEmailBrief,
    handleLoadCalendarAgenda: params.handlers.handleLoadCalendarAgenda,
    handleLoadDeviceCalendarAgenda: params.handlers.handleLoadDeviceCalendarAgenda,
    handleLoadTodayWeatherAdvice: params.handlers.handleLoadTodayWeatherAdvice,
    handleLoadDailyNewsBrief: params.handlers.handleLoadDailyNewsBrief,
    handleChatInputDraftChange: params.setChatInputDraft,
    handleSendChatMessage: params.handlers.handleSendChatMessage,
    handleLogout: params.handlers.handleReset,
    handleOpenMailFromDailyBrief: () => {
      params.setSelectedTab("mail");
      params.setIsDailyBriefModalVisible(false);
    },
    handleOpenNewsFromDailyBrief: () => {
      params.setSelectedTab("news");
      params.setIsDailyBriefModalVisible(false);
    },
    handleRefreshDailyBrief: params.handlers.handleRefreshDailyBrief,
    handleGoogleSignIn: params.handlers.handleGoogleSignIn,
    handleKakaoSignIn: params.handlers.handleKakaoSignIn,
    handlePhoneRequestOtp: params.handlers.handlePhoneRequestOtp,
    handlePhoneVerifyOtp: params.handlers.handlePhoneVerifyOtp,
    handleEmailSignIn: params.handlers.handleEmailSignIn,
    handleReplyToMessage: params.handlers.handleReplyToMessage,
    handleReset: params.handlers.handleReset,
    handleSaveIgnoredSenderDraft: params.handlers.handleSaveIgnoredSenderDraft,
    handleSaveMorningBriefTime: params.handlers.handleSaveMorningBriefTime,
    handleSetLanguage: params.handlers.handleSetLanguage,
    handleToggleNewsCategory: params.handlers.handleToggleNewsCategory,
    labelNewsCategory: category => getCategoryLabel(params.language, category),
    handleActionableErrorPrimary: params.handlers.handleActionableErrorPrimary,
    handleDismissActionableError: params.handlers.handleDismissActionableError,
    handleOpenAsk: params.handlers.handleOpenAsk,
    handleCloseAsk: params.handlers.handleCloseAsk,
    handleToggleAskFabHidden: params.handlers.handleToggleAskFabHidden,
    handleOpenNavExpand: params.handlers.handleOpenNavExpand,
    handleCloseNavExpand: params.handlers.handleCloseNavExpand,
    handleOpenTransit: params.handlers.handleOpenTransit,
    handleCloseTransit: params.handlers.handleCloseTransit,
    handleSelectTab: tab => {
      params.setSelectedTab(tab);
      if (tab !== "settings") {
        params.setSelectedSettingsSection("menu");
      }
    },
    handleSelectSettingsSection: params.setSelectedSettingsSection
  };
}
