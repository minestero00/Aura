import type { AppCopy, AppLanguage } from "@features/app/i18n";
import type { IgnoredSenderRule } from "@features/gmail/storage";
import type { NewsCategory } from "@features/news/types";
import type { SettingsSectionKey } from "@features/app/types";
import type { UsageResponse } from "@features/usage/types";

export interface SettingsScreenProps {
  copy: AppCopy;
  noticeMessage: string | null;
  usage: UsageResponse | null;
  gmailAddress: string | null;
  gmailConnected: boolean;
  gmailConnectedAt: string | null;
  enabledNewsCategories: NewsCategory[];
  ignoredSenderDraft: string;
  ignoredSenderRules: IgnoredSenderRule[];
  morningBriefTimeDraft: string;
  isGmailRefreshRequired: boolean;
  areDailyBriefNotificationsEnabled: boolean;
  isDeviceCalendarPermissionGranted: boolean;
  isGoogleCalendarConnected: boolean;
  isNotificationPermissionGranted: boolean;
  morningBriefTime: string | null;
  eveningBriefTime: string | null;
  departureAlertsEnabled: boolean;
  departureBufferMinutes: number;
  language: AppLanguage;
  labelCategory: (category: NewsCategory) => string;
  selectedSettingsSection: SettingsSectionKey;
  onConnectGmail: () => Promise<void>;
  onConnectDeviceCalendar: () => Promise<void>;
  onDisconnectGmail: () => Promise<void>;
  onOpenGmailSettings: () => void;
  onOpenIgnoredSenderSettings: () => void;
  onOpenLanguageSettings: () => void;
  onOpenNotificationSettings: () => void;
  onOpenPermissionsSettings: () => void;
  onOpenUsageSettings: () => void;
  onOpenDataPrivacySettings: () => void;
  onOpenNewsSettings: () => void;
  onOpenSystemSettings: () => Promise<void>;
  onIgnoredSenderDraftChange: (value: string) => void;
  onMorningBriefTimeDraftChange: (value: string) => void;
  onRemoveIgnoredSender: (senderKey: string) => Promise<void>;
  onSaveIgnoredSenderDraft: () => Promise<void>;
  onSaveMorningBriefTime: () => Promise<void>;
  onSaveEveningBriefTime: (draft: string) => Promise<void>;
  onSetDepartureAlertsEnabled: (enabled: boolean) => Promise<void>;
  onSetDepartureBufferMinutes: (minutes: number) => Promise<void>;
  onSelectSettingsSection: (section: SettingsSectionKey) => void;
  onSetLanguage: (language: AppLanguage) => Promise<void>;
  onDisableDailyBriefNotifications: () => Promise<void>;
  onEnableDailyBriefNotifications: () => Promise<void>;
  onToggleNewsCategory: (category: NewsCategory) => Promise<void>;
  onLogout: () => Promise<void>;
  isAskFabHidden: boolean;
  onToggleAskFabHidden: () => Promise<void>;
  isHealthConnected: boolean;
  onConnectHealth: () => Promise<void>;
  suggestedMorningTime: string | null;
  onApplySuggestedMorningTime: () => Promise<void>;
  onLoadSuggestedMorningTime: () => Promise<void>;
}

export const NEWS_CATEGORIES: NewsCategory[] = [
  "world",
  "business",
  "tech",
  "science",
  "health",
  "sports",
  "entertainment",
  "politics",
  "finance",
  "travel",
  "climate",
  "ai"
];

export function toPickerDate(value: string) {
  const match = /^(\d{1,2}):(\d{2})/.exec(value);
  const date = new Date();

  if (!match) {
    date.setHours(9, 0, 0, 0);
    return date;
  }

  date.setHours(Number(match[1]), Number(match[2]), 0, 0);
  return date;
}
