import React, { useState } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { appStyles as styles } from "../styles";
import type { AuthSessionState } from "../types";
import type { GmailDigest, GmailMessage } from "../../gmail/types";
import type { IgnoredSenderRule } from "../../gmail/storage";
import type { NewsArticle, NewsBriefing } from "../../news/types";

interface HomeScreenProps {
  authState: AuthSessionState;
  errorMessage: string | null;
  gmailDebugState: string;
  gmailDigest: GmailDigest | null;
  gmailMessages: GmailMessage[];
  ignoredSenderRules: IgnoredSenderRule[];
  dailyEmailDigest: GmailDigest | null;
  dailyEmailMessages: GmailMessage[];
  isGmailSubmitting: boolean;
  isInboxLoading: boolean;
  isNewsLoading: boolean;
  newsArticles: NewsArticle[];
  newsBriefing: NewsBriefing | null;
  onConnectGmail: () => Promise<void>;
  onDisconnectGmail: () => Promise<void>;
  onIgnoreSender: (message: GmailMessage) => Promise<void>;
  onLoadDailyEmailBrief: () => Promise<void>;
  onLoadDailyNewsBrief: () => Promise<void>;
  onLoadEmailSummary: () => Promise<void>;
  onLoadRecentEmails: () => Promise<void>;
  onReset: () => Promise<void>;
}

export function HomeScreen({
  authState,
  errorMessage,
  gmailDebugState,
  gmailDigest,
  gmailMessages,
  ignoredSenderRules,
  dailyEmailDigest,
  dailyEmailMessages,
  isGmailSubmitting,
  isInboxLoading,
  isNewsLoading,
  newsArticles,
  newsBriefing,
  onConnectGmail,
  onDisconnectGmail,
  onIgnoreSender,
  onLoadDailyEmailBrief,
  onLoadDailyNewsBrief,
  onLoadEmailSummary,
  onLoadRecentEmails,
  onReset
}: HomeScreenProps) {
  const [selectedMessage, setSelectedMessage] = useState<GmailMessage | null>(null);

  function renderMessageRow(message: GmailMessage, prefix: string) {
    return (
      <View key={`${prefix}-${message.id}`} style={styles.messageCard}>
        <View style={styles.messageHeaderRow}>
          <View style={styles.messageHeaderMain}>
            <Text style={styles.messageSubject}>{message.subject}</Text>
            <Text style={styles.messageMeta}>{message.from}</Text>
          </View>

          <Pressable
            onPress={() => setSelectedMessage(message)}
            style={styles.messageMenuButton}
          >
            <Text style={styles.messageMenuButtonText}>•••</Text>
          </Pressable>
        </View>

        {message.receivedAt ? (
          <Text style={styles.messageMeta}>{message.receivedAt}</Text>
        ) : null}
        <Text style={styles.messageSnippet}>{message.snippet || "No preview available."}</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        style={styles.scrollView}
      >
        <View style={styles.heroCard}>
          <Text style={styles.eyebrow}>Aura</Text>
          <Text style={styles.title}>Welcome back, {authState.me.user.name}</Text>
          <Text style={styles.subtitle}>
            Aura is now signing in with real Google OAuth and your backend-verified session.
          </Text>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Account</Text>
          <Text style={styles.detailLine}>Email: {authState.me.user.email}</Text>
          <Text style={styles.detailLine}>Timezone: {authState.me.user.timezone}</Text>
          <Text style={styles.detailLine}>Plan: {authState.me.user.planTier}</Text>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Preferences</Text>
          <Text style={styles.detailLine}>
            News: {authState.me.preferences.newsCategories.join(", ")}
          </Text>
          <Text style={styles.detailLine}>
            Brief length: {authState.me.preferences.summaryLength}
          </Text>
          <Text style={styles.detailLine}>
            Morning brief: {authState.me.preferences.morningBriefTime}
          </Text>
          <Text style={styles.detailLine}>
            Evening brief: {authState.me.preferences.eveningBriefTime}
          </Text>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <Text style={styles.helperText}>
            Use this first if Gmail access is still not connected.
          </Text>

          <View style={styles.buttonRow}>
            <Pressable
              disabled={isGmailSubmitting}
              onPress={() => void onConnectGmail()}
              style={styles.primaryButton}
            >
              <Text style={styles.primaryButtonText}>Connect Gmail Now</Text>
            </Pressable>
          </View>

          <Text style={styles.debugLabel}>Debug state</Text>
          <Text style={styles.debugValue}>{gmailDebugState}</Text>
          {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Integration State</Text>
          <Text style={styles.detailLine}>
            Gmail connected: {authState.me.integrations.gmailConnected ? "Yes" : "No"}
          </Text>
          <Text style={styles.detailLine}>
            Gmail address: {authState.me.integrations.gmailAddress ?? "Not connected"}
          </Text>
          <Text style={styles.detailLine}>
            Gmail scopes:{" "}
            {authState.me.integrations.gmailScopes.length > 0
              ? authState.me.integrations.gmailScopes.join(", ")
              : "Not granted"}
          </Text>
          <Text style={styles.detailLine}>
            Connected at: {authState.me.integrations.gmailConnectedAt ?? "Not connected"}
          </Text>
          <Text style={styles.detailLine}>
            Sync ready: {authState.me.integrations.gmailSyncReady ? "Yes" : "No"}
          </Text>
          <Text style={styles.tokenLabel}>Access token</Text>
          <Text style={styles.tokenValue}>{authState.session.accessToken}</Text>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Gmail Access</Text>
          <Text style={styles.helperText}>
            Grant read-only Gmail access so Aura can prepare email summaries for your daily brief.
          </Text>

          <View style={styles.buttonRow}>
            <Pressable
              disabled={isGmailSubmitting}
              onPress={() => void onConnectGmail()}
              style={styles.secondaryButton}
            >
              <Text style={styles.secondaryButtonText}>
                {authState.me.integrations.gmailConnected ? "Refresh Gmail Access" : "Connect Gmail"}
              </Text>
            </Pressable>

            {authState.me.integrations.gmailConnected ? (
              <Pressable
                disabled={isGmailSubmitting}
                onPress={() => void onDisconnectGmail()}
                style={styles.outlineButton}
              >
                <Text style={styles.outlineButtonText}>Disconnect Gmail</Text>
              </Pressable>
            ) : null}
          </View>

          {isGmailSubmitting ? (
            <View style={styles.inlineLoading}>
              <ActivityIndicator color="#1d2a35" />
              <Text style={styles.inlineLoadingText}>Updating Gmail access...</Text>
            </View>
          ) : null}

          {ignoredSenderRules.length > 0 ? (
            <>
              <Text style={styles.debugLabel}>Ignored senders</Text>
              {ignoredSenderRules.map(rule => (
                <Text key={rule.senderKey} style={styles.debugValue}>
                  {rule.label}
                </Text>
              ))}
            </>
          ) : null}
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Today's Email Brief</Text>
          <Text style={styles.helperText}>
            Summarize the inbox items that arrived in the past 24 hours.
          </Text>

          <View style={styles.buttonRow}>
            <Pressable
              disabled={isInboxLoading || !authState.me.integrations.gmailConnected}
              onPress={() => void onLoadDailyEmailBrief()}
              style={styles.secondaryButton}
            >
              <Text style={styles.secondaryButtonText}>Summarize Today's Email</Text>
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
          ) : null}

          {dailyEmailMessages.slice(0, 5).map(message => renderMessageRow(message, "daily"))}
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Inbox Preview</Text>
          <Text style={styles.helperText}>
            Load the latest Gmail messages or ask Aura to condense them into a quick digest.
          </Text>

          <View style={styles.buttonRow}>
            <Pressable
              disabled={isInboxLoading || !authState.me.integrations.gmailConnected}
              onPress={() => void onLoadRecentEmails()}
              style={styles.secondaryButton}
            >
              <Text style={styles.secondaryButtonText}>Load Recent Emails</Text>
            </Pressable>

            <Pressable
              disabled={isInboxLoading || !authState.me.integrations.gmailSyncReady}
              onPress={() => void onLoadEmailSummary()}
              style={styles.outlineButton}
            >
              <Text style={styles.outlineButtonText}>Summarize Inbox</Text>
            </Pressable>
          </View>

          {isInboxLoading ? (
            <View style={styles.inlineLoading}>
              <ActivityIndicator color="#1d2a35" />
              <Text style={styles.inlineLoadingText}>Loading inbox data...</Text>
            </View>
          ) : null}

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

          {gmailMessages.map(message => renderMessageRow(message, "inbox"))}
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Daily News Brief</Text>
          <Text style={styles.helperText}>
            Build today's world, business, and tech briefing from current headlines.
          </Text>

          <View style={styles.buttonRow}>
            <Pressable
              disabled={isNewsLoading}
              onPress={() => void onLoadDailyNewsBrief()}
              style={styles.secondaryButton}
            >
              <Text style={styles.secondaryButtonText}>Load Daily News Brief</Text>
            </Pressable>
          </View>

          {isNewsLoading ? (
            <View style={styles.inlineLoading}>
              <ActivityIndicator color="#1d2a35" />
              <Text style={styles.inlineLoadingText}>Loading daily news...</Text>
            </View>
          ) : null}

          {newsBriefing ? (
            <View style={styles.digestCard}>
              <Text style={styles.digestHeadline}>{newsBriefing.headline}</Text>
              {newsBriefing.bullets.map((bullet, index) => (
                <Text key={`news-bullet-${index}`} style={styles.digestBullet}>
                  • {bullet}
                </Text>
              ))}
            </View>
          ) : null}

          {newsArticles.map(article => (
            <View key={article.id} style={styles.messageCard}>
              <Text style={styles.messageSubject}>{article.title}</Text>
              <Text style={styles.messageMeta}>
                {article.category.toUpperCase()} · {article.source}
              </Text>
              <Text style={styles.messageMeta}>{article.publishedAt ?? "Unknown time"}</Text>
            </View>
          ))}
        </View>

        <Pressable onPress={() => void onReset()} style={styles.secondaryButton}>
          <Text style={styles.secondaryButtonText}>Sign Out</Text>
        </Pressable>
      </ScrollView>

      <Modal
        animationType="fade"
        onRequestClose={() => setSelectedMessage(null)}
        transparent
        visible={selectedMessage !== null}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.sectionTitle}>Mail Settings</Text>
            <Text style={styles.helperText}>
              {selectedMessage?.from ?? ""}
            </Text>

            <View style={styles.buttonRow}>
              <Pressable
                onPress={() => {
                  if (selectedMessage) {
                    void onIgnoreSender(selectedMessage);
                  }
                  setSelectedMessage(null);
                }}
                style={styles.primaryButton}
              >
                <Text style={styles.primaryButtonText}>Ignore future emails from this sender</Text>
              </Pressable>

              <Pressable
                onPress={() => setSelectedMessage(null)}
                style={styles.outlineButton}
              >
                <Text style={styles.outlineButtonText}>Close</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
