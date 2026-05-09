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
  issueText,
  onIssuePress
}: {
  styles: AppStyles;
  label: string;
  isOk: boolean;
  issueText?: string | null;
  /** issueText 영역을 누르면 호출 — 권한 요청 prompt 또는 OS 설정 deep link. */
  onIssuePress?: () => void | Promise<void>;
}) {
  return (
    <View style={styles.statusRow}>
      <Text style={styles.statusLabel}>{label}</Text>
      {isOk ? (
        <SettingsOkBadge styles={styles} />
      ) : onIssuePress ? (
        <Pressable
          onPress={() => void onIssuePress()}
          accessibilityRole="button"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={[styles.statusAlertText, styles.statusAlertTextTappable]}>
            {issueText}
          </Text>
        </Pressable>
      ) : (
        <Text style={styles.statusAlertText}>{issueText}</Text>
      )}
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
