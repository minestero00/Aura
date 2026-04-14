import type { AuthResponse, MeResponse } from "@features/auth/types";
import type { GmailDigest, GmailMessage } from "@features/gmail/types";
import type { IgnoredSenderRule } from "@features/gmail/storage";
import type { NewsArticle, NewsBriefing, NewsCategory } from "@features/news/types";
import type { CalendarAgendaDay, CalendarTravelHint } from "@features/calendar/types";
import type { ChatMessage } from "@features/chat/types";
import type { UsageResponse } from "@features/usage/types";
import type { AppCopy, AppLanguage } from "@features/app/i18n";
import type { TodayWeatherAdvice } from "@features/weather/types";

export type AppTabKey = "mail" | "todo" | "news" | "ask" | "settings";
export type SettingsSectionKey =
  | "menu"
  | "gmail"
  | "ignored-senders"
  | "news"
  | "language"
  | "notifications"
  | "permissions"
  | "usage"
  | "data-privacy";

export interface AuthSessionState {
  session: AuthResponse["session"];
  me: MeResponse;
}

export interface UseAuraAppResult {
  authState: AuthSessionState | null;
  copy: AppCopy;
  errorMessage: string | null;
  settingsNoticeMessage: string | null;
  language: AppLanguage;
  gmailDebugState: string;
  gmailDigest: GmailDigest | null;
  gmailMessages: GmailMessage[];
  replyingMessageId: string | null;
  ignoredSenderRules: IgnoredSenderRule[];
  ignoredSenderDraft: string;
  morningBriefTimeDraft: string;
  enabledNewsCategories: NewsCategory[];
  calendarAgendaDays: CalendarAgendaDay[];
  calendarTravelHints: CalendarTravelHint[];
  chatInputDraft: string;
  chatMessages: ChatMessage[];
  areDailyBriefNotificationsEnabled: boolean;
  isCalendarLoading: boolean;
  isCalendarTravelLoading: boolean;
  isDeviceCalendarLoading: boolean;
  isDeviceCalendarPermissionGranted: boolean;
  isNotificationPermissionGranted: boolean;
  isNewsLoading: boolean;
  isChatLoading: boolean;
  isBootstrapping: boolean;
  isDailyBriefPreparing: boolean;
  isGmailSubmitting: boolean;
  isInboxLoading: boolean;
  isSubmitting: boolean;
  isGmailRefreshRequired: boolean;
  isWeatherLoading: boolean;
  dailyEmailDigest: GmailDigest | null;
  dailyEmailMessages: GmailMessage[];
  deviceCalendarAgendaDays: CalendarAgendaDay[];
  newsArticles: NewsArticle[];
  newsBriefing: NewsBriefing | null;
  todayWeatherAdvice: TodayWeatherAdvice | null;
  usage: UsageResponse | null;
  isDailyBriefModalVisible: boolean;
  selectedTab: AppTabKey;
  selectedSettingsSection: SettingsSectionKey;
  selectedTravelMode: "driving" | "transit";
  handleCloseDailyBriefModal: () => void;
  handleOpenMailFromDailyBrief: () => void;
  handleOpenNewsFromDailyBrief: () => void;
  handleRefreshDailyBrief: () => Promise<void>;
  handleConnectDeviceCalendar: () => Promise<void>;
  handleLogout: () => Promise<void>;
  handleConnectGmail: () => Promise<void>;
  handleDisconnectGmail: () => Promise<void>;
  handleIgnoredSenderDraftChange: (value: string) => void;
  handleMorningBriefTimeDraftChange: (value: string) => void;
  handleIgnoreSender: (message: GmailMessage) => Promise<void>;
  handleOpenGmailSettings: () => void;
  handleOpenIgnoredSenderSettings: (message?: GmailMessage) => void;
  handleOpenLanguageSettings: () => void;
  handleOpenNotificationSettings: () => void;
  handleOpenPermissionsSettings: () => void;
  handleOpenUsageSettings: () => void;
  handleOpenDataPrivacySettings: () => void;
  handleOpenNewsSettings: () => void;
  handleOpenSystemSettings: () => Promise<void>;
  handleRemoveIgnoredSender: (senderKey: string) => Promise<void>;
  handleLoadDailyEmailBrief: () => Promise<void>;
  handleLoadCalendarAgenda: () => Promise<void>;
  handleLoadDeviceCalendarAgenda: () => Promise<void>;
  handleLoadTodayWeatherAdvice: () => Promise<void>;
  handleLoadDailyNewsBrief: () => Promise<void>;
  handleChatInputDraftChange: (value: string) => void;
  handleSendChatMessage: (message?: string) => Promise<void>;
  handleGoogleSignIn: () => Promise<void>;
  handleLoadEmailSummary: () => Promise<void>;
  handleLoadRecentEmails: () => Promise<void>;
  handleReplyToMessage: (message: GmailMessage) => Promise<void>;
  handleReset: () => Promise<void>;
  handleSaveIgnoredSenderDraft: () => Promise<void>;
  handleSaveMorningBriefTime: () => Promise<void>;
  handleSelectTab: (tab: AppTabKey) => void;
  handleSelectSettingsSection: (section: SettingsSectionKey) => void;
  handleSetLanguage: (language: AppLanguage) => Promise<void>;
  handleDisableDailyBriefNotifications: () => Promise<void>;
  handleEnableDailyBriefNotifications: () => Promise<void>;
  handleSetTravelMode: (mode: "driving" | "transit") => void;
  handleToggleNewsCategory: (category: NewsCategory) => Promise<void>;
  labelNewsCategory: (category: NewsCategory) => string;
}
