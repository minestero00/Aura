import React from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { SettingsSectionProps } from "@features/app/screens/settings/sections/section-props";
import type { SettingsSectionKey } from "@features/app/types";
import { ScreenEyebrow } from "@features/app/components/screen-eyebrow";

interface CategoryCard {
  key: SettingsSectionKey;
  title: string;
  subtitle: string;
}

export function MenuSection(props: SettingsSectionProps) {
  const { styles, copy, onSelectSettingsSection } = props;

  const categories: CategoryCard[] = [
    {
      key: "cat-account",
      title: copy.settings.catAccountTitle,
      subtitle: copy.settings.catAccountSubtitle
    },
    {
      key: "cat-notifications",
      title: copy.settings.catNotificationsTitle,
      subtitle: copy.settings.catNotificationsSubtitle
    },
    {
      key: "cat-mail",
      title: copy.settings.catMailTitle,
      subtitle: copy.settings.catMailSubtitle
    },
    {
      key: "cat-content",
      title: copy.settings.catContentTitle,
      subtitle: copy.settings.catContentSubtitle
    }
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent} style={styles.scrollView}>
        <View style={styles.heroBare}>
          <ScreenEyebrow label={copy.settings.eyebrow} />
          <Text style={styles.titleOnGradient}>{copy.settings.title}</Text>
          <Text style={styles.subtitleOnGradient}>{copy.settings.subtitle}</Text>
        </View>

        {categories.map(category => (
          <View key={category.key} style={styles.sectionCard}>
            <Pressable
              onPress={() => onSelectSettingsSection(category.key)}
              style={styles.settingsMenuItem}
            >
              <View style={styles.settingsMenuMain}>
                <Text style={styles.messageSubject}>{category.title}</Text>
                <Text style={styles.messageMeta}>{category.subtitle}</Text>
              </View>
              <Text style={styles.settingsChevron}>›</Text>
            </Pressable>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
