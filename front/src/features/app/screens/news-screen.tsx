import React, { useState } from "react";
import { ActivityIndicator, Linking, Modal, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { AppCopy, AppLanguage } from "@features/app/i18n";
import { createAppStyles, useAuraTheme } from "@features/app/styles";
import { formatNewsTime } from "@features/news/format";
import type { NewsArticle, NewsBriefing, NewsCategory } from "@features/news/types";

interface NewsScreenProps {
  copy: AppCopy;
  language: AppLanguage;
  enabledCategories: NewsCategory[];
  isNewsLoading: boolean;
  labelCategory: (category: NewsCategory) => string;
  newsArticles: NewsArticle[];
  newsBriefing: NewsBriefing | null;
  onLoadDailyNewsBrief: () => Promise<void>;
}

export function NewsScreen({
  copy,
  language,
  enabledCategories,
  isNewsLoading,
  labelCategory,
  newsArticles,
  newsBriefing,
  onLoadDailyNewsBrief
}: NewsScreenProps) {
  const theme = useAuraTheme();
  const styles = createAppStyles(theme);
  const [isArticlesOpen, setIsArticlesOpen] = useState(false);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent} style={styles.scrollView}>
        <View style={styles.heroBare}>
          <Text style={styles.eyebrow}>{copy.news.eyebrow}</Text>
          <Text style={styles.title}>{copy.news.title}</Text>
          <Text style={styles.subtitle}>{copy.news.subtitle}</Text>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>{copy.news.todayBriefTitle}</Text>
          <Text style={styles.helperText}>
            {copy.news.activeCategories}:{" "}
            {enabledCategories.map(category => labelCategory(category)).join(", ")}
          </Text>
          <View style={styles.buttonRow}>
            <Pressable
              disabled={isNewsLoading}
              onPress={() => void onLoadDailyNewsBrief()}
              style={styles.secondaryButton}
            >
              <Text style={styles.secondaryButtonText}>{copy.news.loadBrief}</Text>
            </Pressable>
          </View>

          {isNewsLoading ? (
            <View style={styles.inlineLoading}>
              <ActivityIndicator color={theme.colors.textPrimary} />
              <Text style={styles.inlineLoadingText}>{copy.news.loading}</Text>
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

          {newsBriefing ? (
            <View style={styles.buttonRow}>
              <Pressable
                onPress={() => setIsArticlesOpen(true)}
                style={styles.outlineButton}
              >
                <Text style={styles.outlineButtonText}>{copy.news.viewArticles}</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      </ScrollView>

      <Modal
        visible={isArticlesOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsArticlesOpen(false)}
      >
        <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
          <View style={styles.subpageTopBar}>
            <Pressable
              onPress={() => setIsArticlesOpen(false)}
              style={styles.backIconButton}
              accessibilityRole="button"
              accessibilityLabel={copy.common.close}
            >
              <Text style={{ color: theme.colors.textSecondary, fontSize: 22, fontWeight: "700" }}>×</Text>
            </Pressable>
            <Text style={styles.askTopBarTitle}>{copy.news.articlesTitle}</Text>
          </View>
          <ScrollView contentContainerStyle={styles.scrollContent} style={styles.scrollView}>
            {newsArticles.length === 0 ? (
              <Text style={styles.helperText}>{copy.news.articlesEmpty}</Text>
            ) : (
              newsArticles.map(article => (
                <Pressable
                  key={article.id}
                  onPress={() => void Linking.openURL(article.link)}
                  style={styles.messageCard}
                >
                  <Text style={styles.messageSubject}>{article.title}</Text>
                  <Text style={styles.messageMeta}>
                    {labelCategory(article.category)} · {article.source}
                  </Text>
                  <Text style={styles.messageMeta}>
                    {formatNewsTime(article.publishedAt, language) || copy.news.unknownTime}
                  </Text>
                </Pressable>
              ))
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
