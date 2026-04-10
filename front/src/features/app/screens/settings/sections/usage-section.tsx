import React from "react";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { SettingsSubpageHeader } from "@features/app/screens/settings/shared";
import type { SettingsSectionProps } from "@features/app/screens/settings/sections/section-props";

export function UsageSection(props: SettingsSectionProps) {
  const { styles, copy, usage, language, onSelectSettingsSection } = props;

  const usageRows = usage
    ? [
        {
          label: copy.settings.usageOverview,
          used: usage.counters.briefingsGenerated,
          limit: usage.limits.dailyOverview,
          remaining: usage.remaining.dailyOverview
        },
        {
          label: copy.settings.usageChat,
          used: usage.counters.chatRequests,
          limit: usage.limits.dailyChat,
          remaining: usage.remaining.dailyChat
        },
        {
          label: copy.settings.usageRefresh,
          used: usage.counters.refreshRequests,
          limit: usage.limits.dailyManualRefresh,
          remaining: usage.remaining.dailyManualRefresh
        }
      ]
    : [];

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.settingsScreen}>
        <SettingsSubpageHeader
          styles={styles}
          title={copy.settings.usageTitle}
          subtitle={copy.settings.usageSubtitle}
          onSelectSettingsSection={onSelectSettingsSection}
        />
        <ScrollView contentContainerStyle={styles.scrollContent} style={styles.scrollView}>
          {usage ? (
            <View style={styles.sectionCard}>
              <Text style={styles.detailLine}>
                {copy.settings.usageUpdatedAt}: {usage.periodStart.slice(0, 10)}
              </Text>
              <Text style={styles.detailLine}>
                {copy.settings.usageResetAt}: {usage.periodEnd.slice(0, 19).replace("T", " ")} UTC
              </Text>
              {usageRows.map(row => {
                const safeLimit = Math.max(1, row.limit);
                const ratio = Math.min(1, row.used / safeLimit);
                const isLimitReached = row.remaining <= 0;

                return (
                  <View key={row.label} style={styles.usageRow}>
                    <View style={styles.usageRowHeader}>
                      <Text style={styles.messageSubject}>{row.label}</Text>
                      <Text style={styles.messageMeta}>{copy.settings.usageOf(row.used, row.limit)}</Text>
                    </View>
                    <View style={styles.usageTrack}>
                      <View style={[styles.usageFill, { width: `${Math.max(4, Math.round(ratio * 100))}%` }]} />
                    </View>
                    <Text style={isLimitReached ? styles.toggleDisabledText : styles.messageMeta}>
                      {copy.settings.usageRemaining(row.remaining)}
                    </Text>
                  </View>
                );
              })}
            </View>
          ) : (
            <View style={styles.sectionCard}>
              <Text style={styles.helperText}>
                {language === "ko" ? "사용량 정보를 불러오는 중입니다." : "Loading usage details..."}
              </Text>
            </View>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
