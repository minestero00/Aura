import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { AppCopy, AppLanguage } from '@features/app/i18n';
import { createAppStyles, useAuraTheme } from '@features/app/styles';
import type { ChatMessage } from '@features/chat/types';
import type { GmailMessage } from '@features/gmail/types';
import { isUrgentMailQuestion } from '@features/chat/intent';
import { EmptyStateHero } from '@features/app/components/empty-state-hero';
import { ToastMessage } from '@features/app/components/toast-message';
import { voiceRecorder, type VoiceState } from '@features/voice/recorder';

interface AskScreenProps {
  chatInputDraft: string;
  chatMessages: ChatMessage[];
  copy: AppCopy;
  currentUserName: string | null;
  dailyEmailMessages: GmailMessage[];
  errorMessage: string | null;
  isChatLoading: boolean;
  language: AppLanguage;
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
  language,
  onChatInputChange,
  onSendChatMessage,
}: AskScreenProps) {
  const theme = useAuraTheme();
  const styles = createAppStyles(theme);
  const listRef = useRef<FlatList<ChatMessage>>(null);
  const trimmedDraft = chatInputDraft.trim();
  const sendDisabled = isChatLoading || trimmedDraft.length === 0;
  const localeTag = language === "ko" ? "ko-KR" : "en-US";

  function formatBubbleTime(iso: string | undefined): string {
    if (!iso) return "";
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleTimeString(localeTag, { hour: "numeric", minute: "2-digit", hour12: true });
  }

  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [voiceToast, setVoiceToast] = useState<string | null>(null);
  const recordingPulse = useRef(new Animated.Value(0)).current;

  // 녹음 중 빨강 dot pulse 애니메이션 — 사용자에게 active 상태 직관적 피드백.
  useEffect(() => {
    if (voiceState !== 'recording') {
      recordingPulse.stopAnimation();
      recordingPulse.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(recordingPulse, {
          toValue: 1,
          duration: 700,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(recordingPulse, {
          toValue: 0,
          duration: 700,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [voiceState, recordingPulse]);

  // 화면 unmount 시 녹음 중이면 cancel — 시스템 리소스 정리.
  useEffect(() => {
    return () => {
      void voiceRecorder.cancel();
    };
  }, []);

  function showVoiceToast(message: string) {
    setVoiceToast(null);
    setTimeout(() => setVoiceToast(message), 0);
  }

  async function handleVoiceTap() {
    if (voiceState === 'transcribing') return;
    if (voiceState === 'idle') {
      try {
        await voiceRecorder.start();
        setVoiceState('recording');
      } catch (error) {
        showVoiceToast(copy.ask.voicePermissionDenied);
        setVoiceState('idle');
      }
      return;
    }
    // recording → transcribing → text 채움 → idle
    setVoiceState('transcribing');
    try {
      const text = await voiceRecorder.stopAndTranscribe(language);
      if (text.trim().length === 0) {
        showVoiceToast(copy.ask.voiceFailed);
      } else {
        // 기존 draft 뒤에 이어붙임 — 사용자가 텍스트 입력 중간에 음성 추가 가능.
        const next = chatInputDraft.length > 0 ? `${chatInputDraft} ${text}`.trim() : text;
        onChatInputChange(next);
      }
    } catch {
      showVoiceToast(copy.ask.voiceFailed);
    } finally {
      setVoiceState('idle');
    }
  }

  // 새 메시지 / 스트리밍 텍스트 성장에 맞춰 자동으로 맨 아래까지 스크롤.
  // onContentSizeChange는 리스트 콘텐츠 크기 변화마다 호출됨 — 사용자
  // 메시지 추가, assistant placeholder 추가, delta 누적 모두 커버.
  const handleContentSizeChange = useCallback(() => {
    listRef.current?.scrollToEnd({ animated: true });
  }, []);

  const handleQuickPrompt = useCallback(
    (prompt: string) => {
      onChatInputChange(prompt);
      void onSendChatMessage(prompt);
    },
    [onChatInputChange, onSendChatMessage]
  );

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
            ref={listRef}
            contentContainerStyle={styles.askConversationContent}
            data={chatMessages}
            inverted={false}
            keyExtractor={item => item.id}
            onContentSizeChange={handleContentSizeChange}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            ListEmptyComponent={
              <View style={styles.askEmptyWrap}>
                <EmptyStateHero title={copy.ask.empty} body={copy.ask.subtitle} />
                {copy.ask.quickPrompts.length > 0 ? (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.askQuickPromptsRow}
                  >
                    {copy.ask.quickPrompts.map(prompt => (
                      <Pressable
                        key={prompt}
                        onPress={() => handleQuickPrompt(prompt)}
                        style={styles.askQuickPromptChip}
                        disabled={isChatLoading}
                      >
                        <Text style={styles.askQuickPromptText} numberOfLines={2}>
                          {prompt}
                        </Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                ) : null}
              </View>
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

              const isAssistant = message.role === 'assistant';
              const timeLabel = formatBubbleTime(message.createdAt);
              const showTime =
                timeLabel.length > 0 && !(isAssistant && message.isStreaming);
              return (
                <View style={styles.chatMessageBlock}>
                  <View
                    style={[
                      styles.chatBubbleRow,
                      isAssistant
                        ? styles.chatBubbleRowLeft
                        : styles.chatBubbleRowRight,
                    ]}
                  >
                    {!isAssistant && showTime ? (
                      <Text style={[styles.chatBubbleTime, styles.chatBubbleTimeUser]}>
                        {timeLabel}
                      </Text>
                    ) : null}
                    <View
                      style={[
                        styles.chatBubble,
                        isAssistant
                          ? styles.chatBubbleAssistant
                          : styles.chatBubbleUser,
                      ]}
                    >
                      {isAssistant &&
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
                            isAssistant
                              ? styles.chatBubbleTextAssistant
                              : styles.chatBubbleTextUser,
                          ]}
                        >
                          {message.content}
                        </Text>
                      )}
                      {isAssistant && message.citations.length > 0 ? (
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
                    {isAssistant && showTime ? (
                      <Text style={[styles.chatBubbleTime, styles.chatBubbleTimeAssistant]}>
                        {timeLabel}
                      </Text>
                    ) : null}
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
          <View style={styles.askComposerRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={voiceState === 'recording' ? copy.ask.voiceStop : copy.ask.voiceStart}
              onPress={() => void handleVoiceTap()}
              disabled={voiceState === 'transcribing'}
              hitSlop={6}
              style={[
                voiceStyles.micButton,
                {
                  backgroundColor:
                    voiceState === 'recording'
                      ? '#FEE2E2'
                      : theme.colors.surfaceMuted,
                  opacity: voiceState === 'transcribing' ? 0.55 : 1,
                },
              ]}
            >
              {voiceState === 'transcribing' ? (
                <ActivityIndicator color={theme.colors.textSecondary} size="small" />
              ) : voiceState === 'recording' ? (
                <Animated.View
                  style={[
                    voiceStyles.recordingDot,
                    { opacity: recordingPulse.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }) },
                  ]}
                />
              ) : (
                <Text style={[voiceStyles.micIcon, { color: theme.colors.textSecondary }]}>🎙️</Text>
              )}
            </Pressable>

            <TextInput
              multiline
              onChangeText={onChatInputChange}
              placeholder={copy.ask.inputPlaceholder}
              placeholderTextColor={theme.colors.textMuted}
              style={[styles.askComposerInput, styles.askComposerInputFlex]}
              value={chatInputDraft}
            />

            <Pressable
              disabled={sendDisabled}
              onPress={() => void onSendChatMessage()}
              hitSlop={6}
              style={[
                styles.askComposerSendButton,
                sendDisabled ? styles.askComposerSendButtonDisabled : null,
              ]}
            >
              {isChatLoading ? (
                <ActivityIndicator color={theme.colors.accentText} />
              ) : (
                <Text style={styles.askComposerSendIcon}>↑</Text>
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
      <ToastMessage message={voiceToast} onHide={() => setVoiceToast(null)} />
    </SafeAreaView>
  );
}

const voiceStyles = StyleSheet.create({
  micButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  micIcon: {
    fontSize: 20,
  },
  recordingDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#DC2626',
  },
});
