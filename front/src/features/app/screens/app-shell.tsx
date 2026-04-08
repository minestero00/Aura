import React from "react";
import { Pressable, Text, View } from "react-native";
import { MailScreen } from "./mail-screen";
import { NewsScreen } from "./news-screen";
import { SettingsScreen } from "./settings-screen";
import { appStyles as styles } from "../styles";
import type { UseAuraAppResult } from "../types";

interface AppShellProps {
  app: UseAuraAppResult;
}

export function AppShell({ app }: AppShellProps) {
  const gmail = app.authState!.me.integrations;

  return (
    <View style={styles.appShell}>
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

        {app.selectedTab === "settings" ? (
          <SettingsScreen
            copy={app.copy}
            gmailAddress={gmail.gmailAddress}
            gmailConnected={gmail.gmailConnected}
            gmailConnectedAt={gmail.gmailConnectedAt}
            enabledNewsCategories={app.enabledNewsCategories}
            ignoredSenderDraft={app.ignoredSenderDraft}
            ignoredSenderRules={app.ignoredSenderRules}
            isGmailRefreshRequired={app.isGmailRefreshRequired}
            language={app.language}
            labelCategory={app.labelNewsCategory}
            selectedSettingsSection={app.selectedSettingsSection}
            onConnectGmail={app.handleConnectGmail}
            onDisconnectGmail={app.handleDisconnectGmail}
            onOpenGmailSettings={app.handleOpenGmailSettings}
            onOpenIgnoredSenderSettings={() => app.handleOpenIgnoredSenderSettings()}
            onOpenLanguageSettings={app.handleOpenLanguageSettings}
            onOpenNewsSettings={app.handleOpenNewsSettings}
            onIgnoredSenderDraftChange={app.handleIgnoredSenderDraftChange}
            onRemoveIgnoredSender={app.handleRemoveIgnoredSender}
            onSaveIgnoredSenderDraft={app.handleSaveIgnoredSenderDraft}
            onSetLanguage={app.handleSetLanguage}
            onSelectSettingsSection={app.handleSelectSettingsSection}
            onToggleNewsCategory={app.handleToggleNewsCategory}
          />
        ) : null}
      </View>

      <View style={styles.bottomNav}>
        <Pressable
          onPress={() => app.handleSelectTab("mail")}
          style={styles.bottomNavItem}
        >
          <Text
            style={[styles.bottomNavLabel, app.selectedTab === "mail" ? styles.bottomNavLabelActive : null]}
          >
            {app.copy.tabs.mail}
          </Text>
        </Pressable>

        <Pressable
          onPress={() => app.handleSelectTab("news")}
          style={styles.bottomNavItem}
        >
          <Text
            style={[styles.bottomNavLabel, app.selectedTab === "news" ? styles.bottomNavLabelActive : null]}
          >
            {app.copy.tabs.news}
          </Text>
        </Pressable>

        <Pressable
          onPress={() => app.handleSelectTab("settings")}
          style={styles.bottomNavItem}
        >
          <Text
            style={[
              styles.bottomNavLabel,
              app.selectedTab === "settings" ? styles.bottomNavLabelActive : null
            ]}
          >
            {app.copy.tabs.settings}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
