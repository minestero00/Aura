import React, { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { BottomSheetModal } from "@features/app/components/bottom-sheet-modal";
import { createAppStyles, useAuraTheme } from "@features/app/styles";
import type { AppCopy } from "@features/app/i18n";

interface ReplyDraftModalProps {
  draft: { to: string; subject: string; body: string } | null;
  copy: AppCopy;
  onSend: (subject: string, body: string) => Promise<void>;
  onDismiss: () => void;
}

/**
 * AI가 생성한 답장 초안을 사용자가 검토 + 편집한 뒤 native Gmail 앱(또는 기본 메일 앱)에서
 * 직접 send. AURA backend는 send 안 함 — 권한 가드 단순화 + 잘못 발송 위험 0.
 */
export function ReplyDraftModal({ draft, copy, onSend, onDismiss }: ReplyDraftModalProps) {
  const theme = useAuraTheme();
  const appStyles = createAppStyles(theme);
  const [subject, setSubject] = useState(draft?.subject ?? "");
  const [body, setBody] = useState(draft?.body ?? "");
  const [submitting, setSubmitting] = useState(false);

  // draft 새로 들어오면 textarea 동기화. 닫혔다가 다시 열려도 초기화.
  useEffect(() => {
    setSubject(draft?.subject ?? "");
    setBody(draft?.body ?? "");
  }, [draft]);

  async function handleSend() {
    if (submitting) return;
    setSubmitting(true);
    try {
      await onSend(subject, body);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <BottomSheetModal visible={draft !== null} onClose={onDismiss} sheetStyle={appStyles.modalCard}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={appStyles.modalHandle} />
        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
          {copy.mail.replyDraft}
        </Text>
        <Text style={[styles.recipientLabel, { color: theme.colors.textSecondary }]}>
          {copy.mail.replyTo}: {draft?.to ?? ""}
        </Text>

        <ScrollView keyboardShouldPersistTaps="handled" style={styles.scroll}>
          <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>
            {copy.mail.replySubject}
          </Text>
          <TextInput
            value={subject}
            onChangeText={setSubject}
            style={[
              styles.subjectInput,
              {
                color: theme.colors.textPrimary,
                backgroundColor: theme.colors.surfaceMuted,
                borderColor: theme.colors.line
              }
            ]}
          />

          <Text
            style={[styles.fieldLabel, { color: theme.colors.textSecondary, marginTop: 12 }]}
          >
            {copy.mail.replyBody}
          </Text>
          <TextInput
            value={body}
            onChangeText={setBody}
            multiline
            style={[
              styles.bodyInput,
              {
                color: theme.colors.textPrimary,
                backgroundColor: theme.colors.surfaceMuted,
                borderColor: theme.colors.line
              }
            ]}
          />
        </ScrollView>

        <View style={styles.buttonRow}>
          <Pressable
            onPress={onDismiss}
            style={[styles.outlineButton, { borderColor: theme.colors.line }]}
          >
            <Text style={[styles.outlineButtonText, { color: theme.colors.textPrimary }]}>
              {copy.common.close}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => void handleSend()}
            disabled={submitting}
            style={[
              styles.primaryButton,
              { backgroundColor: theme.colors.accent, opacity: submitting ? 0.6 : 1 }
            ]}
          >
            <Text style={[styles.primaryButtonText, { color: theme.colors.accentText }]}>
              {copy.mail.openInGmail}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 18, fontWeight: "800", marginBottom: 4 },
  recipientLabel: { fontSize: 13, marginBottom: 12 },
  scroll: { maxHeight: 360 },
  fieldLabel: { fontSize: 12, fontWeight: "700", letterSpacing: 0.3, marginBottom: 6 },
  subjectInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15
  },
  bodyInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    minHeight: 160,
    textAlignVertical: "top"
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 16
  },
  outlineButton: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1
  },
  outlineButtonText: { fontSize: 14, fontWeight: "700" },
  primaryButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12
  },
  primaryButtonText: { fontSize: 14, fontWeight: "800" }
});
