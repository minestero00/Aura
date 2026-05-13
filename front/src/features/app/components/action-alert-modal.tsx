import React, { useMemo } from "react";
import { Pressable, Text, View } from "react-native";
import { BottomSheetModal } from "@features/app/components/bottom-sheet-modal";
import { createAppStyles, useAuraTheme } from "@features/app/styles";
import type { AppCopy } from "@features/app/i18n";
import type { ActionableError } from "@features/app/types";
import { buildActionAlertModalStyles } from "./action-alert-modal.styles";

interface ActionAlertModalProps {
  copy: AppCopy;
  error: ActionableError | null;
  onPrimary: () => Promise<void> | void;
  onDismiss: () => void;
}

/**
 * 한 번의 탭으로 회복할 수 있는 에러를 BottomSheetModal로 안내.
 * ActionableError union에 새 kind를 추가하면 여기서만 분기를 늘리면 됨.
 */
export function ActionAlertModal({ copy, error, onPrimary, onDismiss }: ActionAlertModalProps) {
  const theme = useAuraTheme();
  const appStyles = useMemo(() => createAppStyles(theme), [theme]);
  const styles = useMemo(() => buildActionAlertModalStyles(theme), [theme]);

  let title = "";
  let body = "";
  let primaryLabel = copy.actionable.primaryAction;
  if (error?.kind === "gmail-reconnect") {
    title = copy.actionable.gmailReconnectTitle;
    body = copy.actionable.gmailReconnectBody;
  } else if (error?.kind === "location-permission") {
    title = copy.actionable.locationPermissionTitle;
    body = copy.actionable.locationPermissionBody;
    primaryLabel = copy.actionable.locationPermissionPrimary;
  } else if (error?.kind === "calendar-permission") {
    title = copy.actionable.calendarPermissionTitle;
    body = copy.actionable.calendarPermissionBody;
    primaryLabel = copy.actionable.calendarPermissionPrimary;
  }

  return (
    <BottomSheetModal visible={error !== null} onClose={onDismiss} sheetStyle={appStyles.modalCard}>
      <View style={appStyles.modalHandle} />
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{body}</Text>
      <Pressable
        style={styles.primary}
        onPress={() => {
          void onPrimary();
        }}
        accessibilityRole="button"
      >
        <Text style={styles.primaryText}>{primaryLabel}</Text>
      </Pressable>
      <Pressable style={styles.secondary} onPress={onDismiss} accessibilityRole="button">
        <Text style={styles.secondaryText}>{copy.actionable.dismiss}</Text>
      </Pressable>
    </BottomSheetModal>
  );
}
