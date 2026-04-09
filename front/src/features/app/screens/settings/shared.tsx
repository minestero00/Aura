import React from "react";
import { Pressable, Text, View } from "react-native";
import { createAppStyles } from "@features/app/styles";
import type { SettingsSectionKey } from "@features/app/types";

type AppStyles = ReturnType<typeof createAppStyles>;

export function SettingsOkBadge({ styles }: { styles: AppStyles }) {
  return (
    <View style={styles.statusOkBadge}>
      <Text style={styles.statusOkBadgeText}>OK</Text>
    </View>
  );
}

export function SettingsStatusRow({
  styles,
  label,
  isOk,
  issueText
}: {
  styles: AppStyles;
  label: string;
  isOk: boolean;
  issueText?: string | null;
}) {
  return (
    <View style={styles.statusRow}>
      <Text style={styles.statusLabel}>{label}</Text>
      {isOk ? <SettingsOkBadge styles={styles} /> : <Text style={styles.statusAlertText}>{issueText}</Text>}
    </View>
  );
}

export function SettingsSubpageHeader({
  styles,
  title,
  subtitle,
  onSelectSettingsSection,
  meta
}: {
  styles: AppStyles;
  title: string;
  subtitle: string;
  onSelectSettingsSection: (section: SettingsSectionKey) => void;
  meta?: React.ReactNode;
}) {
  return (
    <View style={styles.subpageHeader}>
      <View style={styles.subpageHeaderRow}>
        <Pressable onPress={() => onSelectSettingsSection("menu")} style={styles.backIconButton}>
          <Text style={styles.backIconText}>‹</Text>
        </Pressable>
        <Text style={styles.subpageTitle}>{title}</Text>
      </View>
      <Text style={styles.subpageSubtitle}>{subtitle}</Text>
      {meta}
    </View>
  );
}
