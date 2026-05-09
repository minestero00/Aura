import React, { useMemo } from "react";
import { Modal, Pressable, Text, View } from "react-native";
import { useAuraTheme } from "@features/app/styles";
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
 * 사용자가 한 번의 탭으로 회복할 수 있는 에러를 인라인 메시지 대신 카드 톤
 * modal로 안내. ActionableError union에 새 kind를 추가하면 여기서만 분기를
 * 늘리면 된다 — 호출 지점/Provider/wiring 변경 X.
 */
export function ActionAlertModal({ copy, error, onPrimary, onDismiss }: ActionAlertModalProps) {
  const theme = useAuraTheme();
  const styles = useMemo(() => buildActionAlertModalStyles(theme), [theme]);

  if (!error) return null;

  let title = "";
  let body = "";
  let primaryLabel = copy.actionable.primaryAction;
  if (error.kind === "gmail-reconnect") {
    title = copy.actionable.gmailReconnectTitle;
    body = copy.actionable.gmailReconnectBody;
  } else if (error.kind === "location-permission") {
    title = copy.actionable.locationPermissionTitle;
    body = copy.actionable.locationPermissionBody;
    primaryLabel = copy.actionable.locationPermissionPrimary;
  }

  return (
    <Modal transparent visible animationType="fade" onRequestClose={onDismiss}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
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
        </View>
      </View>
    </Modal>
  );
}
