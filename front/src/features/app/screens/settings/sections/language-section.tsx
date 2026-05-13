import React from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { SettingsOkBadge, SettingsSubpageHeader } from "@features/app/screens/settings/shared";
import type { SettingsSectionProps } from "@features/app/screens/settings/sections/section-props";

export function LanguageSection(props: SettingsSectionProps) {
  const { styles, copy, language, onSetLanguage, onSelectSettingsSection } = props;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.settingsScreen}>
        <SettingsSubpageHeader
          styles={styles}
          title={copy.settings.languageTitle}
          subtitle={copy.settings.languageSubtitle}
          onSelectSettingsSection={onSelectSettingsSection}
          parentSection="cat-account"
        />
        <ScrollView contentContainerStyle={styles.scrollContent} style={styles.scrollView}>
          <View style={styles.sectionCard}>
            <Pressable onPress={() => void onSetLanguage("en")} style={styles.settingsRow}>
              <View style={styles.settingsRowMain}>
                <Text style={styles.messageSubject}>{copy.settings.languageEnglish}</Text>
              </View>
              {language === "en" ? <SettingsOkBadge styles={styles} /> : <Text style={styles.toggleDisabledText}>-</Text>}
            </Pressable>

            <Pressable onPress={() => void onSetLanguage("ko")} style={styles.settingsRow}>
              <View style={styles.settingsRowMain}>
                <Text style={styles.messageSubject}>{copy.settings.languageKorean}</Text>
              </View>
              {language === "ko" ? <SettingsOkBadge styles={styles} /> : <Text style={styles.toggleDisabledText}>-</Text>}
            </Pressable>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
