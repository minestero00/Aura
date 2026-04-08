import React from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { AppCopy, AppLanguage } from "../i18n";
import { appStyles as styles } from "../styles";
import type { IgnoredSenderRule } from "../../gmail/storage";
import type { NewsCategory } from "../../news/types";
import type { SettingsSectionKey } from "../types";

interface SettingsScreenProps {
  copy: AppCopy;
  gmailAddress: string | null;
  gmailConnected: boolean;
  gmailConnectedAt: string | null;
  enabledNewsCategories: NewsCategory[];
  ignoredSenderDraft: string;
  ignoredSenderRules: IgnoredSenderRule[];
  isGmailRefreshRequired: boolean;
  language: AppLanguage;
  labelCategory: (category: NewsCategory) => string;
  selectedSettingsSection: SettingsSectionKey;
  onConnectGmail: () => Promise<void>;
  onDisconnectGmail: () => Promise<void>;
  onOpenGmailSettings: () => void;
  onOpenIgnoredSenderSettings: () => void;
  onOpenLanguageSettings: () => void;
  onOpenNewsSettings: () => void;
  onIgnoredSenderDraftChange: (value: string) => void;
  onRemoveIgnoredSender: (senderKey: string) => Promise<void>;
  onSaveIgnoredSenderDraft: () => Promise<void>;
  onSelectSettingsSection: (section: SettingsSectionKey) => void;
  onSetLanguage: (language: AppLanguage) => Promise<void>;
  onToggleNewsCategory: (category: NewsCategory) => Promise<void>;
}

const NEWS_CATEGORIES: NewsCategory[] = [
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

export function SettingsScreen({
  copy,
  gmailAddress,
  gmailConnected,
  gmailConnectedAt,
  enabledNewsCategories,
  ignoredSenderDraft,
  ignoredSenderRules,
  isGmailRefreshRequired,
  language,
  labelCategory,
  selectedSettingsSection,
  onConnectGmail,
  onDisconnectGmail,
  onOpenGmailSettings,
  onOpenIgnoredSenderSettings,
  onOpenLanguageSettings,
  onOpenNewsSettings,
  onIgnoredSenderDraftChange,
  onRemoveIgnoredSender,
  onSaveIgnoredSenderDraft,
  onSelectSettingsSection,
  onSetLanguage,
  onToggleNewsCategory
}: SettingsScreenProps) {
  function renderBackBar() {
    return (
      <View style={styles.subpageTopBar}>
        <Pressable onPress={() => onSelectSettingsSection("menu")} style={styles.backIconButton}>
          <Text style={styles.backIconText}>‹</Text>
        </Pressable>
      </View>
    );
  }

  function renderSubpageHeader(title: string, subtitle: string, meta?: React.ReactNode) {
    return (
      <View style={styles.subpageHeader}>
        <Text style={styles.subpageTitle}>{title}</Text>
        <Text style={styles.subpageSubtitle}>{subtitle}</Text>
        {meta}
      </View>
    );
  }

  if (selectedSettingsSection === "gmail") {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.settingsScreen}>
          {renderBackBar()}
          {renderSubpageHeader(copy.settings.gmailTitle, copy.settings.gmailSubtitle)}
          <ScrollView contentContainerStyle={styles.scrollContent} style={styles.scrollView}>
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>{copy.settings.currentStatus}</Text>
              <Text style={styles.detailLine}>
                {copy.settings.connected}: {gmailConnected ? copy.settings.yes : copy.settings.no}
              </Text>
              <Text style={styles.detailLine}>
                {copy.settings.address}: {gmailAddress ?? copy.settings.notConnected}
              </Text>
              <Text style={styles.detailLine}>
                {copy.settings.connectedAt}: {gmailConnectedAt ?? copy.settings.notConnected}
              </Text>

              {isGmailRefreshRequired ? (
                <View style={styles.warningCard}>
                  <Text style={styles.warningText}>{copy.settings.refreshRequired}</Text>
                  <Text style={styles.helperText}>{copy.settings.refreshHelp}</Text>
                </View>
              ) : null}

              <View style={styles.buttonRow}>
                <Pressable onPress={() => void onConnectGmail()} style={styles.secondaryButton}>
                  <Text style={styles.secondaryButtonText}>
                    {gmailConnected ? copy.settings.refreshGmail : copy.settings.connectGmail}
                  </Text>
                </Pressable>

                {gmailConnected ? (
                  <Pressable onPress={() => void onDisconnectGmail()} style={styles.outlineButton}>
                    <Text style={styles.outlineButtonText}>{copy.settings.disconnectGmail}</Text>
                  </Pressable>
                ) : null}
              </View>
            </View>
          </ScrollView>
        </View>
      </SafeAreaView>
    );
  }

  if (selectedSettingsSection === "ignored-senders") {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.settingsScreen}>
          {renderBackBar()}
          {renderSubpageHeader(copy.settings.ignoredTitle, copy.settings.ignoredSubtitle)}
          <ScrollView contentContainerStyle={styles.scrollContent} style={styles.scrollView}>
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>{copy.settings.ignoredManage}</Text>
              <Text style={styles.helperText}>{copy.settings.ignoredHelper}</Text>

              <TextInput
                autoCapitalize="none"
                keyboardType="email-address"
                onChangeText={onIgnoredSenderDraftChange}
                placeholder={copy.settings.ignoredPlaceholder}
                style={styles.textInput}
                value={ignoredSenderDraft}
              />

              <View style={styles.buttonRow}>
                <Pressable onPress={() => void onSaveIgnoredSenderDraft()} style={styles.secondaryButton}>
                  <Text style={styles.secondaryButtonText}>{copy.settings.addIgnored}</Text>
                </Pressable>
              </View>

              {ignoredSenderRules.length === 0 ? (
                <Text style={styles.helperText}>{copy.settings.noIgnored}</Text>
              ) : null}

              {ignoredSenderRules.map(rule => (
                <View key={rule.senderKey} style={styles.settingsRow}>
                  <View style={styles.settingsRowMain}>
                    <Text style={styles.messageSubject}>{rule.label}</Text>
                    <Text style={styles.messageMeta}>{rule.senderKey}</Text>
                  </View>

                  <Pressable
                    onPress={() => void onRemoveIgnoredSender(rule.senderKey)}
                    style={styles.outlineButtonCompact}
                  >
                    <Text style={styles.outlineButtonText}>{copy.settings.remove}</Text>
                  </Pressable>
                </View>
              ))}
            </View>
          </ScrollView>
        </View>
      </SafeAreaView>
    );
  }

  if (selectedSettingsSection === "news") {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.settingsScreen}>
          {renderBackBar()}
          {renderSubpageHeader(
            copy.settings.newsTopicsTitle,
            copy.settings.newsTopicsSubtitle,
            <View style={styles.subpageMetaRow}>
              <Text style={styles.helperText}>{copy.settings.maxTopicsHelp}</Text>
              <Text style={styles.subpageMetaText}>
                {copy.settings.selectedTopics(enabledNewsCategories.length)}
              </Text>
            </View>
          )}
          <ScrollView contentContainerStyle={styles.chipScrollContent} style={styles.scrollView}>
            {NEWS_CATEGORIES.map(category => {
              const enabled = enabledNewsCategories.includes(category);

              return (
                <Pressable
                  key={category}
                  onPress={() => void onToggleNewsCategory(category)}
                  style={[styles.chipButton, enabled ? styles.chipButtonActive : null]}
                >
                  <Text
                    style={[
                      styles.chipButtonLabel,
                      enabled ? styles.chipButtonLabelActive : null
                    ]}
                  >
                    #{labelCategory(category)}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </SafeAreaView>
    );
  }

  if (selectedSettingsSection === "language") {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.settingsScreen}>
          {renderBackBar()}
          {renderSubpageHeader(copy.settings.languageTitle, copy.settings.languageSubtitle)}
          <ScrollView contentContainerStyle={styles.scrollContent} style={styles.scrollView}>
            <View style={styles.sectionCard}>
              <Pressable onPress={() => void onSetLanguage("en")} style={styles.settingsRow}>
                <View style={styles.settingsRowMain}>
                  <Text style={styles.messageSubject}>{copy.settings.languageEnglish}</Text>
                </View>
                <Text style={language === "en" ? styles.toggleEnabledText : styles.toggleDisabledText}>
                  {language === "en" ? copy.settings.on : copy.settings.off}
                </Text>
              </Pressable>

              <Pressable onPress={() => void onSetLanguage("ko")} style={styles.settingsRow}>
                <View style={styles.settingsRowMain}>
                  <Text style={styles.messageSubject}>{copy.settings.languageKorean}</Text>
                </View>
                <Text style={language === "ko" ? styles.toggleEnabledText : styles.toggleDisabledText}>
                  {language === "ko" ? copy.settings.on : copy.settings.off}
                </Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent} style={styles.scrollView}>
        <View style={styles.heroCard}>
          <Text style={styles.eyebrow}>{copy.settings.eyebrow}</Text>
          <Text style={styles.title}>{copy.settings.title}</Text>
          <Text style={styles.subtitle}>{copy.settings.subtitle}</Text>
        </View>

        <View style={styles.sectionCard}>
          <Pressable onPress={onOpenGmailSettings} style={styles.settingsMenuItem}>
            <View style={styles.settingsMenuMain}>
              <Text style={styles.messageSubject}>{copy.settings.menuGmail}</Text>
              <Text style={styles.messageMeta}>
                {gmailConnected
                  ? isGmailRefreshRequired
                    ? copy.settings.refreshRequired
                    : gmailAddress ?? copy.settings.connected
                  : copy.settings.notConnected}
              </Text>
            </View>
            <Text style={styles.settingsChevron}>›</Text>
          </Pressable>
        </View>

        <View style={styles.sectionCard}>
          <Pressable onPress={onOpenIgnoredSenderSettings} style={styles.settingsMenuItem}>
            <View style={styles.settingsMenuMain}>
              <Text style={styles.messageSubject}>{copy.settings.ignoredTitle}</Text>
              <Text style={styles.messageMeta}>{copy.settings.menuIgnored(ignoredSenderRules.length)}</Text>
            </View>
            <Text style={styles.settingsChevron}>›</Text>
          </Pressable>
        </View>

        <View style={styles.sectionCard}>
          <Pressable onPress={onOpenNewsSettings} style={styles.settingsMenuItem}>
            <View style={styles.settingsMenuMain}>
              <Text style={styles.messageSubject}>{copy.settings.menuNewsTopics}</Text>
              <Text style={styles.messageMeta}>
                {enabledNewsCategories.map(category => labelCategory(category)).join(", ")}
              </Text>
            </View>
            <Text style={styles.settingsChevron}>›</Text>
          </Pressable>
        </View>

        <View style={styles.sectionCard}>
          <Pressable onPress={onOpenLanguageSettings} style={styles.settingsMenuItem}>
            <View style={styles.settingsMenuMain}>
              <Text style={styles.messageSubject}>{copy.settings.menuLanguage}</Text>
              <Text style={styles.messageMeta}>
                {language === "ko" ? copy.settings.languageKorean : copy.settings.languageEnglish}
              </Text>
            </View>
            <Text style={styles.settingsChevron}>›</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
