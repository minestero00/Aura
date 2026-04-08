import type { AuthResponse, MeResponse } from "../auth/types";
import type { GmailDigest, GmailMessage } from "../gmail/types";
import type { IgnoredSenderRule } from "../gmail/storage";
import type { NewsArticle, NewsBriefing, NewsCategory } from "../news/types";
import type { AppCopy, AppLanguage } from "./i18n";

export type AppTabKey = "mail" | "news" | "settings";
export type SettingsSectionKey = "menu" | "gmail" | "ignored-senders" | "news" | "language";

export interface AuthSessionState {
  session: AuthResponse["session"];
  me: MeResponse;
}

export interface UseAuraAppResult {
  authState: AuthSessionState | null;
  copy: AppCopy;
  errorMessage: string | null;
  language: AppLanguage;
  gmailDebugState: string;
  gmailDigest: GmailDigest | null;
  gmailMessages: GmailMessage[];
  replyingMessageId: string | null;
  ignoredSenderRules: IgnoredSenderRule[];
  ignoredSenderDraft: string;
  enabledNewsCategories: NewsCategory[];
  isNewsLoading: boolean;
  isBootstrapping: boolean;
  isGmailSubmitting: boolean;
  isInboxLoading: boolean;
  isSubmitting: boolean;
  isGmailRefreshRequired: boolean;
  dailyEmailDigest: GmailDigest | null;
  dailyEmailMessages: GmailMessage[];
  newsArticles: NewsArticle[];
  newsBriefing: NewsBriefing | null;
  selectedTab: AppTabKey;
  selectedSettingsSection: SettingsSectionKey;
  handleConnectGmail: () => Promise<void>;
  handleDisconnectGmail: () => Promise<void>;
  handleIgnoredSenderDraftChange: (value: string) => void;
  handleIgnoreSender: (message: GmailMessage) => Promise<void>;
  handleOpenGmailSettings: () => void;
  handleOpenIgnoredSenderSettings: (message?: GmailMessage) => void;
  handleOpenLanguageSettings: () => void;
  handleOpenNewsSettings: () => void;
  handleRemoveIgnoredSender: (senderKey: string) => Promise<void>;
  handleLoadDailyEmailBrief: () => Promise<void>;
  handleLoadDailyNewsBrief: () => Promise<void>;
  handleGoogleSignIn: () => Promise<void>;
  handleLoadEmailSummary: () => Promise<void>;
  handleLoadRecentEmails: () => Promise<void>;
  handleReplyToMessage: (message: GmailMessage) => Promise<void>;
  handleReset: () => Promise<void>;
  handleSaveIgnoredSenderDraft: () => Promise<void>;
  handleSelectTab: (tab: AppTabKey) => void;
  handleSelectSettingsSection: (section: SettingsSectionKey) => void;
  handleSetLanguage: (language: AppLanguage) => Promise<void>;
  handleToggleNewsCategory: (category: NewsCategory) => Promise<void>;
  labelNewsCategory: (category: NewsCategory) => string;
}
