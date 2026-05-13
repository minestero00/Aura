import React from "react";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { SettingsSubpageHeader } from "@features/app/screens/settings/shared";
import type { SettingsSectionProps } from "@features/app/screens/settings/sections/section-props";

export function DataPrivacySection(props: SettingsSectionProps) {
  const { styles, copy, onSelectSettingsSection } = props;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.settingsScreen}>
        <SettingsSubpageHeader
          styles={styles}
          title={copy.settings.dataPrivacyTitle}
          subtitle={copy.settings.dataPrivacySubtitle}
          onSelectSettingsSection={onSelectSettingsSection}
          parentSection="cat-content"
        />
        <ScrollView contentContainerStyle={styles.scrollContent} style={styles.scrollView}>
          <View style={styles.sectionCard}>
            <View style={styles.settingsRow}>
              <View style={styles.settingsRowMain}>
                <Text style={styles.messageSubject}>{copy.settings.dataPrivacyGoogleTitle}</Text>
                <Text style={styles.messageSnippet}>{copy.settings.dataPrivacyGoogleBody}</Text>
              </View>
            </View>

            <View style={styles.settingsRow}>
              <View style={styles.settingsRowMain}>
                <Text style={styles.messageSubject}>{copy.settings.dataPrivacyGmailTitle}</Text>
                <Text style={styles.messageSnippet}>{copy.settings.dataPrivacyGmailBody}</Text>
              </View>
            </View>

            <View style={styles.settingsRow}>
              <View style={styles.settingsRowMain}>
                <Text style={styles.messageSubject}>{copy.settings.dataPrivacyCalendarTitle}</Text>
                <Text style={styles.messageSnippet}>{copy.settings.dataPrivacyCalendarBody}</Text>
              </View>
            </View>

            <View style={styles.settingsRow}>
              <View style={styles.settingsRowMain}>
                <Text style={styles.messageSubject}>{copy.settings.dataPrivacyLocationTitle}</Text>
                <Text style={styles.messageSnippet}>{copy.settings.dataPrivacyLocationBody}</Text>
              </View>
            </View>

            <View style={styles.settingsRow}>
              <View style={styles.settingsRowMain}>
                <Text style={styles.messageSubject}>{copy.settings.dataPrivacyAiTitle}</Text>
                <Text style={styles.messageSnippet}>{copy.settings.dataPrivacyAiBody}</Text>
              </View>
            </View>

            <View style={styles.settingsRow}>
              <View style={styles.settingsRowMain}>
                <Text style={styles.messageSubject}>{copy.settings.dataPrivacyStorageTitle}</Text>
                <Text style={styles.messageSnippet}>{copy.settings.dataPrivacyStorageBody}</Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
