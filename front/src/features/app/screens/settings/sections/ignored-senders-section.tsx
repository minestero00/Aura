import React from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { SettingsSubpageHeader } from "@features/app/screens/settings/shared";
import type { SettingsSectionProps } from "@features/app/screens/settings/sections/section-props";

export function IgnoredSendersSection(props: SettingsSectionProps) {
  const {
    styles,
    copy,
    ignoredSenderDraft,
    ignoredSenderRules,
    onIgnoredSenderDraftChange,
    onSaveIgnoredSenderDraft,
    onRemoveIgnoredSender,
    onSelectSettingsSection
  } = props;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.settingsScreen}>
        <SettingsSubpageHeader
          styles={styles}
          title={copy.settings.ignoredTitle}
          subtitle={copy.settings.ignoredSubtitle}
          onSelectSettingsSection={onSelectSettingsSection}
          parentSection="cat-mail"
        />
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
