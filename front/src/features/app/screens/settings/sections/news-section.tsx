import React from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { SettingsSubpageHeader } from "@features/app/screens/settings/shared";
import { NEWS_CATEGORIES } from "@features/app/screens/settings/types";
import type { SettingsSectionProps } from "@features/app/screens/settings/sections/section-props";

export function NewsSection(props: SettingsSectionProps) {
  const {
    styles,
    copy,
    enabledNewsCategories,
    labelCategory,
    onToggleNewsCategory,
    onSelectSettingsSection
  } = props;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.settingsScreen}>
        <SettingsSubpageHeader
          styles={styles}
          title={copy.settings.newsTopicsTitle}
          subtitle={copy.settings.newsTopicsSubtitle}
          onSelectSettingsSection={onSelectSettingsSection}
          parentSection="cat-content"
          meta={
            <View style={styles.subpageMetaRow}>
              <Text style={styles.helperText}>{copy.settings.maxTopicsHelp}</Text>
              <Text style={styles.subpageMetaText}>
                {copy.settings.selectedTopics(enabledNewsCategories.length)}
              </Text>
            </View>
          }
        />
        <ScrollView contentContainerStyle={styles.chipScrollContent} style={styles.scrollView}>
          {NEWS_CATEGORIES.map(category => {
            const enabled = enabledNewsCategories.includes(category);

            return (
              <Pressable
                key={category}
                onPress={() => void onToggleNewsCategory(category)}
                style={[styles.chipButton, enabled ? styles.chipButtonActive : null]}
              >
                <Text style={[styles.chipButtonLabel, enabled ? styles.chipButtonLabelActive : null]}>
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
