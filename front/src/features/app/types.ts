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
  | "data-privacy"
  | "unsubscribe"
  | "wallet";

export interface AuthSessionState {
  session: AuthResponse["session"];
  me: MeResponse;
}

/**
 * Errors that the user can resolve in one tap. Surfaced as a brand-tone
 * modal with a primary action button instead of a passive inline message.
 *
 * 새 케이스 추가는 discriminated union에 한 줄 + ActionAlertModal에 분기 +
 * 에러 발생 지점에서 setActionableError로 set. 그 외 wiring은 그대로.
 */
export type ActionableError =
  | { kind: "gmail-reconnect" }
  | { kind: "location-permission" }
  | { kind: "calendar-permission" };

export interface UseAuraAppResult {
  authState: AuthSessionState | null;
  copy: AppCopy;
  errorMessage: string | null;
  actionableError: ActionableError | null;
  settingsNoticeMessage: string | null;
  language: AppLanguage;
  gmailDebugState: string;
  replyingMessageId: string | null;
  replyDraft: { to: string; subject: string; body: string } | null;
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
  /** Ask(채팅)을 별도 modal로 띄울지 — bottom nav에서 분리, 우측 상단 FAB 진입. */
  isAskOpen: boolean;
  /** 우측 상단 채팅 FAB을 숨길지 — 사용자가 설정에서 토글. */
  isAskFabHidden: boolean;
  /** Health Connect(Android) 권한 + 데이터 sync 가능 상태. */
  isHealthConnected: boolean;
  /** 어제 health 데이터 기반 한 줄 톤 조절 — backend wellness 모듈이 결정론적으로 생성. */
  wellnessTip: string | null;
  /** 7일간 brief 열람 시각 평균 — 사용자에게 push 시간 추천. null이면 데이터 부족. */
  suggestedMorningTime: string | null;
  /** Bottom nav를 위로 끌어올린 expanded drawer 표시 여부. */
  isNavExpanded: boolean;
  /** 버스 도착 알림 modal — drawer에서 진입. */
  isTransitOpen: boolean;
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
  handleOpenWalletSettings: () => void;
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
  handleKakaoSignIn: () => Promise<void>;
  handlePhoneRequestOtp: (phone: string) => Promise<void>;
  handlePhoneVerifyOtp: (phone: string, token: string) => Promise<void>;
  handleEmailSignIn: (email: string, password: string) => Promise<void>;
  handleReplyToMessage: (message: GmailMessage) => Promise<void>;
  handleSendReplyExternal: () => Promise<void>;
  handleDismissReplyDraft: () => void;
  handleReset: () => Promise<void>;
  handleSaveIgnoredSenderDraft: () => Promise<void>;
  handleSaveMorningBriefTime: () => Promise<void>;
  handleSaveEveningBriefTime: (draft: string) => Promise<void>;
  handleSetDepartureAlertsEnabled: (enabled: boolean) => Promise<void>;
  handleSetDepartureBufferMinutes: (minutes: number) => Promise<void>;
  handleSelectTab: (tab: AppTabKey) => void;
  handleSelectSettingsSection: (section: SettingsSectionKey) => void;
  handleSetLanguage: (language: AppLanguage) => Promise<void>;
  handleDisableDailyBriefNotifications: () => Promise<void>;
  handleEnableDailyBriefNotifications: () => Promise<void>;
  handleSetTravelMode: (mode: "driving" | "transit") => void;
  handleToggleNewsCategory: (category: NewsCategory) => Promise<void>;
  labelNewsCategory: (category: NewsCategory) => string;
  /** 사용자가 modal의 primary action(예: Gmail 재연결)을 눌렀을 때. */
  handleActionableErrorPrimary: () => Promise<void>;
  /** 사용자가 modal을 닫았을 때 (잠시 미루기). */
  handleDismissActionableError: () => void;
  /** 우측 상단 채팅 FAB → Ask modal 열기. */
  handleOpenAsk: () => void;
  /** Ask modal 닫기. */
  handleCloseAsk: () => void;
  /** 채팅 FAB 표시/숨김 토글 (설정 화면). */
  handleToggleAskFabHidden: () => Promise<void>;
  /** Health Connect(Android) 시스템 화면 deeplink + 권한 부여 후 sync 시도. */
  handleConnectHealth: () => Promise<void>;
  /** 추천 시간(suggestedMorningTime)을 morningBriefTime에 적용. */
  handleApplySuggestedMorningTime: () => Promise<void>;
  /** Settings 진입 시 7일 평균 시간을 fetch — 추천 row 표시용. */
  handleLoadSuggestedMorningTime: () => Promise<void>;
  /** 구독 정리 후보를 backend에서 fetch. */
  handleLoadUnsubscribeCandidates: () => Promise<void>;
  /** RFC 8058 1-click unsubscribe 발송 (oneClick=true 발신자 전용). */
  handleOneClickUnsubscribe: (url: string) => Promise<void>;
  /** Settings → 구독 정리 화면 진입. */
  handleOpenUnsubscribeSettings: () => void;
  /** 최근 fetch한 구독 해제 후보. */
  unsubscribeCandidates: import("@features/gmail/api").UnsubscribeCandidate[];
  /** 후보 fetch 진행 중. */
  isUnsubscribeLoading: boolean;
  /** Mail card에서 메시지 본문을 LLM이 분석해 캘린더 일정으로 변환. */
  handleExtractCalendarEvent: (messageId: string) => Promise<void>;
  handleCloseCalendarExtract: () => void;
  isCalendarExtractOpen: boolean;
  isCalendarExtractLoading: boolean;
  extractedEvent: import("@features/gmail/api").ExtractedCalendarEvent | null;
  handleExtractCouponFromMessage: (messageId: string) => Promise<void>;
  handleSaveExtractedCoupon: (input: import("@features/wallet/types").CreateCouponInput) => Promise<boolean>;
  handleCloseWalletExtract: () => void;
  isWalletExtractOpen: boolean;
  isWalletExtractLoading: boolean;
  walletExtractCandidate: import("@features/wallet/api").CouponExtractCandidate | null;
  /** Bottom nav 끌어올림 → expanded drawer 열기. */
  handleOpenNavExpand: () => void;
  /** Drawer 닫기 (백드롭 탭 또는 swipe down). */
  handleCloseNavExpand: () => void;
  /** 버스 도착 알림 modal 열기 (drawer 항목에서 호출). */
  handleOpenTransit: () => void;
  /** 버스 도착 알림 modal 닫기. */
  handleCloseTransit: () => void;
}
