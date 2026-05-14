import React from "react";
import {
  AccountCategorySection,
  ContentCategorySection,
  MailCategorySection,
  NotificationsCategorySection
} from "@features/app/screens/settings/sections/category-section";
import { GmailSection } from "@features/app/screens/settings/sections/gmail-section";
import { IgnoredSendersSection } from "@features/app/screens/settings/sections/ignored-senders-section";
import { LanguageSection } from "@features/app/screens/settings/sections/language-section";
import { MenuSection } from "@features/app/screens/settings/sections/menu-section";
import { NewsSection } from "@features/app/screens/settings/sections/news-section";
import { NotificationsSection } from "@features/app/screens/settings/sections/notifications-section";
import { PermissionsSection } from "@features/app/screens/settings/sections/permissions-section";
import type { SettingsSectionProps } from "@features/app/screens/settings/sections/section-props";
import { UsageSection } from "@features/app/screens/settings/sections/usage-section";
import { DataPrivacySection } from "@features/app/screens/settings/sections/data-privacy-section";
import { UnsubscribeSection } from "@features/app/screens/settings/sections/unsubscribe-section";
import { WalletSection } from "@features/app/screens/settings/sections/wallet-section";
import { TransitSection } from "@features/app/screens/settings/sections/transit-section";
import {
  SwipeBackContainer,
  getParentSettingsSection
} from "@features/app/screens/settings/shared";

/**
 * Settings router — 2단계 navigation:
 * menu → 4 카테고리 (cat-*) → 개별 sub-section (gmail, notifications, …)
 *
 * sub-section과 카테고리는 SwipeBackContainer로 감싸서 좌측 edge swipe로 부모로 복귀.
 */
export function SettingsSectionContent(props: SettingsSectionProps) {
  const current = props.selectedSettingsSection;

  if (current === "menu") return <MenuSection {...props} />;

  const body = pickSection(current, props);
  if (!body) return <MenuSection {...props} />;

  // parent 화면을 좌측 layer로 미리 렌더 → swipe 동안 iOS 표준 parallax 효과.
  // 같은 props라 부담 거의 없음 (React reconciliation이 이전 상태 그대로).
  const parent = getParentSettingsSection(current);
  const previous = pickSection(parent, props);

  return (
    <SwipeBackContainer
      onBack={() => props.onSelectSettingsSection(parent)}
      previous={previous}
    >
      {body}
    </SwipeBackContainer>
  );
}

function pickSection(
  key: SettingsSectionProps["selectedSettingsSection"],
  props: SettingsSectionProps
) {
  switch (key) {
    case "cat-account":
      return <AccountCategorySection {...props} />;
    case "cat-notifications":
      return <NotificationsCategorySection {...props} />;
    case "cat-mail":
      return <MailCategorySection {...props} />;
    case "cat-content":
      return <ContentCategorySection {...props} />;
    case "gmail":
      return <GmailSection {...props} />;
    case "ignored-senders":
      return <IgnoredSendersSection {...props} />;
    case "news":
      return <NewsSection {...props} />;
    case "language":
      return <LanguageSection {...props} />;
    case "notifications":
      return <NotificationsSection {...props} />;
    case "permissions":
      return <PermissionsSection {...props} />;
    case "usage":
      return <UsageSection {...props} />;
    case "data-privacy":
      return <DataPrivacySection {...props} />;
    case "unsubscribe":
      return <UnsubscribeSection {...props} />;
    case "wallet":
      return <WalletSection {...props} />;
    case "transit":
      return <TransitSection {...props} />;
    default:
      return null;
  }
}
