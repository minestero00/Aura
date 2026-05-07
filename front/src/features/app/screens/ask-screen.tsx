import React from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { AppCopy } from '@features/app/i18n';
import { createAppStyles, useAuraTheme } from '@features/app/styles';
import type { ChatMessage } from '@features/chat/types';
import type { GmailMessage } from '@features/gmail/types';
import { isUrgentMailQuestion } from '@features/chat/intent';

interface AskScreenProps {
  chatInputDraft: string;
  chatMessages: ChatMessage[];
  copy: AppCopy;
  currentUserName: string | null;
  dailyEmailMessages: GmailMessage[];
  errorMessage: string | null;
  isChatLoading: boolean;
  onChatInputChange: (value: string) => void;
  onSendChatMessage: (message?: string) => Promise<void>;
}

export function AskScreen({
  chatInputDraft,
  chatMessages,
  copy,
  currentUserName,
  dailyEmailMessages,
  errorMessage,
  isChatLoading,
  onChatInputChange,
  onSendChatMessage,
}: AskScreenProps) {
  const theme = useAuraTheme();
  const styles = createAppStyles(theme);
  const userLabel = currentUserName?.trim() || copy.ask.userLabel;

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={8}
        style={styles.askScreen}
      >
        <View style={styles.askTopBar}>
          <Text style={styles.askTopBarTitle}>{copy.tabs.ask}</Text>
          <Text style={styles.askTopBarSubtitle}>{copy.ask.subtitle}</Text>
        </View>

        <View style={styles.askConversationWrap}>
          {errorMessage ? (
            <Text style={styles.errorText}>{errorMessage}</Text>
          ) : null}
          <FlatList
            contentContainerStyle={styles.askConversationContent}
            data={chatMessages}
            inverted={false}
            keyExtractor={item => item.id}
            ListEmptyComponent={
              <Text style={styles.helperText}>{copy.ask.empty}</Text>
            }
            renderItem={({ item: message, index }) => {
              const previousUser = [...chatMessages]
                .slice(0, index)
                .reverse()
                .find(candidate => candidate.role === 'user');
              const shouldShowUrgentCards =
                message.role === 'assistant' &&
                Boolean(previousUser) &&
                isUrgentMailQuestion(previousUser!.content) &&
                dailyEmailMessages.length > 0;

              return (
                <View style={styles.chatMessageBlock}>
                  <View
                    style={[
                      styles.chatBubbleRow,
                      message.role === 'assistant'
                        ? styles.chatBubbleRowLeft
                        : styles.chatBubbleRowRight,
                    ]}
                  >
                    <View
                      style={[
                        styles.chatBubble,
                        message.role === 'assistant'
                          ? styles.chatBubbleAssistant
                          : styles.chatBubbleUser,
                      ]}
                    >
                      <Text
                        style={[
                          styles.chatBubbleLabel,
                          message.role === 'assistant'
                            ? styles.chatBubbleLabelAssistant
                            : styles.chatBubbleLabelUser,
                        ]}
                      >
                        {message.role === 'assistant'
                          ? copy.ask.assistantLabel
                          : userLabel}
                      </Text>
                      {message.role === 'assistant' &&
                      message.isStreaming &&
                      !message.content.trim() ? (
                        <View style={styles.chatTypingRow}>
                          <ActivityIndicator
                            color={theme.colors.textMuted}
                            size="small"
                          />
                          <Text
                            style={[
                              styles.chatBubbleText,
                              styles.chatBubbleTextAssistant,
                              styles.chatTypingText,
                            ]}
                          >
                            {copy.ask.typing}
                          </Text>
                        </View>
                      ) : (
                        <Text
                          style={[
                            styles.chatBubbleText,
                            message.role === 'assistant'
                              ? styles.chatBubbleTextAssistant
                              : styles.chatBubbleTextUser,
                          ]}
                        >
                          {message.content}
                        </Text>
                      )}
                      {message.role === 'assistant' &&
                      message.citations.length > 0 ? (
                        <View style={styles.chatCitationRow}>
                          {message.citations.map((citation, index) => (
                            <Text
                              key={`${message.id}-citation-${index}`}
                              style={styles.chatCitationText}
                            >
                              • {citation.title}
                            </Text>
                          ))}
                        </View>
                      ) : null}
                    </View>
                  </View>
                  {shouldShowUrgentCards ? (
                    <View style={styles.urgentMailCardsWrap}>
                      {dailyEmailMessages.slice(0, 3).map(mail => (
                        <View
                          key={`urgent-mail-${mail.id}`}
                          style={styles.urgentMailCard}
                        >
                          <Text
                            style={styles.urgentMailCardSubject}
                            numberOfLines={1}
                          >
                            {mail.subject}
                          </Text>
                          <Text
                            style={styles.urgentMailCardMeta}
                            numberOfLines={1}
                          >
                            {mail.from}
                          </Text>
                          <Text
                            style={styles.urgentMailCardSnippet}
                            numberOfLines={2}
                          >
                            {mail.snippet || copy.mail.noPreview}
                          </Text>
                        </View>
                      ))}
                    </View>
                  ) : null}
                </View>
              );
            }}
            style={styles.askConversationList}
          />
        </View>

        <View style={styles.askComposerCard}>
          {/* <Text style={styles.inputLabel}>{copy.ask.inputLabel}</Text> */}
          <TextInput
            multiline
            onChangeText={onChatInputChange}
            placeholder={copy.ask.inputPlaceholder}
            placeholderTextColor={theme.colors.textMuted}
            style={styles.askComposerInput}
            value={chatInputDraft}
          />
          <View style={styles.askComposerActions}>
            <Pressable
              disabled={isChatLoading}
              onPress={() => void onSendChatMessage()}
              style={styles.primaryButton}
            >
              {isChatLoading ? (
                <ActivityIndicator color={theme.colors.accentText} />
              ) : (
                <Text style={styles.primaryButtonText}>{copy.ask.send}</Text>
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
