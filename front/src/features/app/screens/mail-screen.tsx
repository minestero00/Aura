import React, { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MessageList } from "@components/message-list";
import { AuraLoader } from "@features/app/components/aura-loader";
import { EmptyStateHero } from "@features/app/components/empty-state-hero";
import { ReloadButton } from "@features/app/components/reload-button";
import { ScreenEyebrow } from "@features/app/components/screen-eyebrow";
import type { AppCopy } from "@features/app/i18n";
import { createAppStyles, useAuraTheme } from "@features/app/styles";
import type { GmailDigest, GmailMessage, GmailMessageLabel } from "@features/gmail/types";

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
  onExtractCalendarEvent: (messageId: string) => Promise<void>;
  onExtractCoupon: (messageId: string) => Promise<void>;
  replyingMessageId: string | null;
}

type FilterKey = "all" | GmailMessageLabel;

const FILTER_ORDER: FilterKey[] = ["all", "needs_reply", "info", "promo", "social"];

function filterLabel(copy: AppCopy, key: FilterKey) {
  switch (key) {
    case "all":         return copy.mail.filterAll;
    case "needs_reply": return copy.mail.labelNeedsReply;
    case "info":        return copy.mail.labelInfo;
    case "promo":       return copy.mail.labelPromo;
    case "social":      return copy.mail.labelSocial;
  }
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
  onExtractCalendarEvent,
  onExtractCoupon,
  replyingMessageId
}: MailScreenProps) {
  const theme = useAuraTheme();
  const styles = createAppStyles(theme);
  const [filter, setFilter] = useState<FilterKey>("all");

  const scrollRef = useRef<ScrollView>(null);
  // 필터+메시지 섹션이 ScrollView 콘텐츠 내에서 몇 px 위치인지 저장
  const listSectionY = useRef(0);

  const filteredMessages = useMemo(() => {
    if (filter === "all") return dailyEmailMessages.slice(0, 5);
    return dailyEmailMessages.filter(m => (m.label ?? "info") === filter).slice(0, 5);
  }, [dailyEmailMessages, filter]);

  // 렌더 완료 후 스크롤 — setFilter 직후 즉시 scrollTo하면 레이아웃이 아직
  // 갱신되지 않아 콘텐츠 높이가 짧은 상태일 수 있어 스크롤이 무시된다.
  // useEffect + setTimeout으로 React 커밋 + 레이아웃 계산 완료 후 실행.
  useEffect(() => {
    if (filter === "all") return;
    const timer = setTimeout(() => {
      scrollRef.current?.scrollTo({ y: listSectionY.current - 8, animated: true });
    }, 80);
    return () => clearTimeout(timer);
  }, [filter]);

  function handleFilterChange(key: FilterKey) {
    setFilter(key);
  }

  const hasMessages = dailyEmailMessages.length > 0;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.scrollContent}
        style={styles.scrollView}
      >
        {/* ── 헤더 ── */}
        <View style={styles.heroBare}>
          <ScreenEyebrow label={copy.mail.eyebrow} />
          <Text style={styles.title}>{copy.mail.title}</Text>
          <Text style={styles.subtitle}>{copy.mail.subtitle}</Text>
        </View>

        {/* ── Gmail 미연결 빈 상태 ── */}
        {!gmailConnected && !hasMessages ? (
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

        {/* ── AI 요약 카드 (digest만 포함, 필터 없음) ── */}
        {gmailConnected || hasMessages ? (
          <View style={styles.sectionCard}>
            <View style={cardHeaderStyles.row}>
              <Text style={styles.sectionTitle}>{copy.mail.todayBriefTitle}</Text>
              <ReloadButton
                accessibilityLabel={copy.mail.summarizeToday}
                disabled={isInboxLoading || !gmailConnected}
                onPress={() => void onLoadDailyEmailBrief()}
              />
            </View>
            {dailyEmailDigest ? (
              <View style={styles.digestCard}>
                <Text style={styles.digestHeadline}>{dailyEmailDigest.headline}</Text>
                {dailyEmailDigest.bullets.map((bullet, index) => (
                  <Text key={`bullet-${index}`} style={styles.digestBullet}>
                    • {bullet}
                  </Text>
                ))}
              </View>
            ) : isInboxLoading ? (
              <View style={[styles.digestCard, { paddingVertical: 24, alignItems: "center" }]}>
                <AuraLoader size="sm" message={copy.mail.updatingBrief} />
              </View>
            ) : null}
            {dailyEmailDigest && isInboxLoading ? (
              <View style={styles.inlineLoading}>
                <AuraLoader size="sm" message={copy.mail.updatingBrief} />
              </View>
            ) : null}
          </View>
        ) : null}

        {/* ── 필터 + 메시지 목록 ─────────────────────────────────────────
            ScrollView의 직접 자식이므로 onLayout.y = scrollContent 내 절대 위치.
            filter 탭 시 scrollTo(listSectionY)로 이 섹션 상단이 화면 최상단에 오도록.
        ────────────────────────────────────────────────────────────── */}
        {hasMessages ? (
          <View
            style={styles.sectionCard}
            onLayout={e => { listSectionY.current = e.nativeEvent.layout.y; }}
          >
            {/* 필터 칩 */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={filterStyles.row}
            >
              {FILTER_ORDER.map(key => {
                const isActive = filter === key;
                return (
                  <Pressable
                    key={`filter-${key}`}
                    onPress={() => handleFilterChange(key)}
                    style={[
                      filterStyles.chip,
                      { backgroundColor: isActive ? theme.colors.accent : theme.colors.surfaceMuted }
                    ]}
                  >
                    <Text
                      style={[
                        filterStyles.chipText,
                        { color: isActive ? theme.colors.accentText : theme.colors.textSecondary }
                      ]}
                    >
                      {filterLabel(copy, key)}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {/* 메시지 목록 */}
            <MessageList
              copy={copy}
              messages={filteredMessages}
              onOpenIgnoredSenderSettings={onOpenIgnoredSenderSettings}
              onReplyToMessage={onReplyToMessage}
              onExtractCalendarEvent={onExtractCalendarEvent}
              onExtractCoupon={onExtractCoupon}
              replyingMessageId={replyingMessageId}
              showReceivedAt={false}
            />

            {filteredMessages.length === 0 && !isInboxLoading ? (
              <Text style={[styles.helperText, { textAlign: "center", marginTop: 16 }]}>
                해당 분류의 메일이 없습니다.
              </Text>
            ) : null}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const filterStyles = StyleSheet.create({
  row: {
    marginBottom: 12,
    flexDirection: "row"
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    marginRight: 8
  },
  chipText: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.3
  }
});

const cardHeaderStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 12
  }
});
