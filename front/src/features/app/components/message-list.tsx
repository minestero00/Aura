import React, { useState } from "react";
import { Modal, Pressable, Text, View } from "react-native";
import type { AppCopy } from "../i18n";
import { appStyles as styles } from "../styles";
import type { GmailMessage } from "../../gmail/types";

interface MessageListProps {
  copy: AppCopy;
  messages: GmailMessage[];
  onOpenIgnoredSenderSettings: (message: GmailMessage) => void;
  onReplyToMessage: (message: GmailMessage) => Promise<void>;
  replyingMessageId: string | null;
  showReceivedAt?: boolean;
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

  return (
    <>
      {messages.map(message => (
        <View key={message.id} style={styles.messageCard}>
          <View style={styles.messageHeaderRow}>
            <View style={styles.messageHeaderMain}>
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
      ))}

      <Modal
        animationType="fade"
        onRequestClose={() => setSelectedMessage(null)}
        transparent
        visible={selectedMessage !== null}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
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
          </View>
        </View>
      </Modal>
    </>
  );
}
