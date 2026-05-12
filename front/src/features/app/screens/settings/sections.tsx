import React from "react";
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

export function SettingsSectionContent(props: SettingsSectionProps) {
  if (props.selectedSettingsSection === "gmail") {
    return <GmailSection {...props} />;
  }

  if (props.selectedSettingsSection === "ignored-senders") {
    return <IgnoredSendersSection {...props} />;
  }

  if (props.selectedSettingsSection === "news") {
    return <NewsSection {...props} />;
  }

  if (props.selectedSettingsSection === "language") {
    return <LanguageSection {...props} />;
  }

  if (props.selectedSettingsSection === "notifications") {
    return <NotificationsSection {...props} />;
  }

  if (props.selectedSettingsSection === "permissions") {
    return <PermissionsSection {...props} />;
  }

  if (props.selectedSettingsSection === "usage") {
    return <UsageSection {...props} />;
  }

  if (props.selectedSettingsSection === "data-privacy") {
    return <DataPrivacySection {...props} />;
  }

  if (props.selectedSettingsSection === "unsubscribe") {
    return <UnsubscribeSection {...props} />;
  }

  if (props.selectedSettingsSection === "wallet") {
    return <WalletSection {...props} />;
  }

  return <MenuSection {...props} />;
}
