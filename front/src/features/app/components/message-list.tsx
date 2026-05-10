import React, { useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import type { AppCopy } from "@features/app/i18n";
import { createAppStyles, useAuraTheme } from "@features/app/styles";
import type { GmailMessage, GmailMessageLabel } from "@features/gmail/types";

interface MessageListProps {
  copy: AppCopy;
  messages: GmailMessage[];
  onOpenIgnoredSenderSettings: (message: GmailMessage) => void;
  onReplyToMessage: (message: GmailMessage) => Promise<void>;
  replyingMessageId: string | null;
  showReceivedAt?: boolean;
}

function labelText(copy: AppCopy, label: GmailMessageLabel): string {
  switch (label) {
    case "needs_reply":
      return copy.mail.labelNeedsReply;
    case "promo":
      return copy.mail.labelPromo;
    case "social":
      return copy.mail.labelSocial;
    case "info":
    default:
      return copy.mail.labelInfo;
  }
}

function labelTone(label: GmailMessageLabel) {
  switch (label) {
    case "needs_reply":
      return { background: "#FEE2E2", text: "#B91C1C" };
    case "promo":
      return { background: "#F3F4F6", text: "#6B7280" };
    case "social":
      return { background: "#E0E7FF", text: "#4338CA" };
    case "info":
    default:
      return { background: "#E0F2FE", text: "#0369A1" };
  }
}

export function MessageList({
  copy,
  messages,
  onOpenIgnoredSenderSettings,
  onReplyToMessage,
  replyingMessageId,
  showReceivedAt = true
}: MessageListProps) {
  const [selectedMessage, setSelectedMessage] = useState<GmailMessage | null>(null);
  const styles = createAppStyles(useAuraTheme());

  return (
    <>
      {messages.map(message => {
        const label: GmailMessageLabel = message.label ?? "info";
        const tone = labelTone(label);
        return (
        <View key={message.id} style={styles.messageCard}>
          <View style={styles.messageHeaderRow}>
            <View style={styles.messageHeaderMain}>
              <View style={chipStyles.row}>
                <View style={[chipStyles.chip, { backgroundColor: tone.background }]}>
                  <Text style={[chipStyles.chipText, { color: tone.text }]}>{labelText(copy, label)}</Text>
                </View>
              </View>
              <Text style={styles.messageSubject}>{message.subject}</Text>
              <Text style={styles.messageMeta}>{message.from}</Text>
            </View>

            <View style={styles.messageActions}>
              <Pressable
                onPress={() => void onReplyToMessage(message)}
                style={styles.replyButton}
              >
                <Text style={styles.replyButtonText}>
                  {replyingMessageId === message.id ? copy.mail.draftingReply : copy.mail.replyDraft}
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setSelectedMessage(message)}
                style={styles.messageMenuButton}
              >
                <Text style={styles.messageMenuButtonText}>•••</Text>
              </Pressable>
            </View>
          </View>

          {showReceivedAt && message.receivedAt ? (
            <Text style={styles.messageMeta}>{message.receivedAt}</Text>
          ) : null}
          <Text style={styles.messageSnippet}>{message.snippet || copy.mail.noPreview}</Text>
        </View>
        );
      })}

      <Modal
        animationType="fade"
        onRequestClose={() => setSelectedMessage(null)}
        transparent
        visible={selectedMessage !== null}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setSelectedMessage(null)}>
          <Pressable onPress={() => undefined} style={styles.modalCard}>
            <View style={styles.modalHandle} />
            <Text style={styles.sectionTitle}>{copy.mail.mailSettings}</Text>
            <Text style={styles.helperText}>{selectedMessage?.from ?? ""}</Text>

            <View style={styles.buttonRow}>
              <Pressable
                onPress={() => {
                  if (selectedMessage) {
                    onOpenIgnoredSenderSettings(selectedMessage);
                  }
                  setSelectedMessage(null);
                }}
                style={styles.primaryButton}
              >
                <Text style={styles.primaryButtonText}>{copy.mail.openIgnoredSenderSettings}</Text>
              </Pressable>

              <Pressable
                onPress={() => setSelectedMessage(null)}
                style={styles.outlineButton}
              >
                <Text style={styles.outlineButtonText}>{copy.common.close}</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const chipStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 6
  },
  chip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999
  },
  chipText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.3
  }
});
