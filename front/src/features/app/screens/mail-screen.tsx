import React from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MessageList } from "@components/message-list";
import { AuraLoader } from "@features/app/components/aura-loader";
import { EmptyStateHero } from "@features/app/components/empty-state-hero";
import { ScreenEyebrow } from "@features/app/components/screen-eyebrow";
import type { AppCopy } from "@features/app/i18n";
import { createAppStyles, useAuraTheme } from "@features/app/styles";
import type { GmailDigest, GmailMessage } from "@features/gmail/types";

interface MailScreenProps {
  copy: AppCopy;
  dailyEmailDigest: GmailDigest | null;
  dailyEmailMessages: GmailMessage[];
  errorMessage: string | null;
  gmailConnected: boolean;
  isInboxLoading: boolean;
  onOpenIgnoredSenderSettings: (message: GmailMessage) => void;
  onLoadDailyEmailBrief: () => Promise<void>;
  onReplyToMessage: (message: GmailMessage) => Promise<void>;
  replyingMessageId: string | null;
}

export function MailScreen({
  copy,
  dailyEmailDigest,
  dailyEmailMessages,
  errorMessage,
  gmailConnected,
  isInboxLoading,
  onOpenIgnoredSenderSettings,
  onLoadDailyEmailBrief,
  onReplyToMessage,
  replyingMessageId
}: MailScreenProps) {
  const theme = useAuraTheme();
  const styles = createAppStyles(theme);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent} style={styles.scrollView}>
        <View style={styles.heroBare}>
          <ScreenEyebrow label={copy.mail.eyebrow} />
          <Text style={styles.titleOnGradient}>{copy.mail.title}</Text>
          <Text style={styles.subtitleOnGradient}>{copy.mail.subtitle}</Text>
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

          {dailyEmailDigest ? (
            <View style={styles.digestCard}>
              <Text style={styles.digestHeadline}>{dailyEmailDigest.headline}</Text>
              {dailyEmailDigest.bullets.map((bullet, index) => (
                <Text key={`daily-email-bullet-${index}`} style={styles.digestBullet}>
                  • {bullet}
                </Text>
              ))}
            </View>
          ) : isInboxLoading ? (
            <View style={[styles.digestCard, { paddingVertical: 28, alignItems: "center" }]}>
              <AuraLoader size="md" message={copy.mail.updatingBrief} />
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
      </ScrollView>
    </SafeAreaView>
  );
}
