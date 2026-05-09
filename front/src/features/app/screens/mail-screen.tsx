import React from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MessageList } from "@components/message-list";
import { EmptyStateHero } from "@features/app/components/empty-state-hero";
import type { AppCopy } from "@features/app/i18n";
import { createAppStyles, useAuraTheme } from "@features/app/styles";
import type { GmailDigest, GmailMessage } from "@features/gmail/types";

interface MailScreenProps {
  copy: AppCopy;
  dailyEmailDigest: GmailDigest | null;
  dailyEmailMessages: GmailMessage[];
  errorMessage: string | null;
  gmailConnected: boolean;
  gmailDigest: GmailDigest | null;
  gmailMessages: GmailMessage[];
  isInboxLoading: boolean;
  onOpenIgnoredSenderSettings: (message: GmailMessage) => void;
  onLoadDailyEmailBrief: () => Promise<void>;
  onLoadEmailSummary: () => Promise<void>;
  onLoadRecentEmails: () => Promise<void>;
  onReplyToMessage: (message: GmailMessage) => Promise<void>;
  replyingMessageId: string | null;
}

export function MailScreen({
  copy,
  dailyEmailDigest,
  dailyEmailMessages,
  errorMessage,
  gmailConnected,
  gmailDigest,
  gmailMessages,
  isInboxLoading,
  onOpenIgnoredSenderSettings,
  onLoadDailyEmailBrief,
  onLoadEmailSummary,
  onLoadRecentEmails,
  onReplyToMessage,
  replyingMessageId
}: MailScreenProps) {
  const theme = useAuraTheme();
  const styles = createAppStyles(theme);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent} style={styles.scrollView}>
        <View style={styles.heroBare}>
          <Text style={styles.eyebrow}>{copy.mail.eyebrow}</Text>
          <Text style={styles.title}>{copy.mail.title}</Text>
          <Text style={styles.subtitle}>{copy.mail.subtitle}</Text>
        </View>

        {!gmailConnected ? (
          <View style={styles.sectionCard}>
            <EmptyStateHero
              title={copy.mail.gmailNotConnectedTitle}
              body={copy.mail.gmailNotConnectedBody}
            />
          </View>
        ) : null}

        {errorMessage ? (
          <View style={styles.sectionCard}>
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        ) : null}

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>{copy.mail.todayBriefTitle}</Text>
          <View style={styles.buttonRow}>
            <Pressable
              disabled={isInboxLoading || !gmailConnected}
              onPress={() => void onLoadDailyEmailBrief()}
              style={styles.secondaryButton}
            >
              <Text style={styles.secondaryButtonText}>{copy.mail.summarizeToday}</Text>
            </Pressable>
          </View>

          {isInboxLoading ? (
            <View style={styles.inlineLoading}>
              <ActivityIndicator color={theme.colors.textPrimary} />
              <Text style={styles.inlineLoadingText}>{copy.mail.updatingBrief}</Text>
            </View>
          ) : null}

          {dailyEmailDigest ? (
            <View style={styles.digestCard}>
              <Text style={styles.digestHeadline}>{dailyEmailDigest.headline}</Text>
              {dailyEmailDigest.bullets.map((bullet, index) => (
                <Text key={`daily-email-bullet-${index}`} style={styles.digestBullet}>
                  • {bullet}
                </Text>
              ))}
            </View>
          ) : null}

          <MessageList
            copy={copy}
            messages={dailyEmailMessages.slice(0, 5)}
            onOpenIgnoredSenderSettings={onOpenIgnoredSenderSettings}
            onReplyToMessage={onReplyToMessage}
            replyingMessageId={replyingMessageId}
            showReceivedAt={false}
          />
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>{copy.mail.inboxPreviewTitle}</Text>
          <View style={styles.buttonRow}>
            <Pressable
              disabled={isInboxLoading || !gmailConnected}
              onPress={() => void onLoadRecentEmails()}
              style={styles.secondaryButton}
            >
              <Text style={styles.secondaryButtonText}>{copy.mail.loadRecent}</Text>
            </Pressable>

            <Pressable
              disabled={isInboxLoading || !gmailConnected}
              onPress={() => void onLoadEmailSummary()}
              style={styles.outlineButton}
            >
              <Text style={styles.outlineButtonText}>{copy.mail.summarizeInbox}</Text>
            </Pressable>
          </View>

          {gmailDigest ? (
            <View style={styles.digestCard}>
              <Text style={styles.digestHeadline}>{gmailDigest.headline}</Text>
              {gmailDigest.bullets.map((bullet, index) => (
                <Text key={`gmail-bullet-${index}`} style={styles.digestBullet}>
                  • {bullet}
                </Text>
              ))}
            </View>
          ) : null}

          <MessageList
            copy={copy}
            messages={gmailMessages}
            onOpenIgnoredSenderSettings={onOpenIgnoredSenderSettings}
            onReplyToMessage={onReplyToMessage}
            replyingMessageId={replyingMessageId}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
