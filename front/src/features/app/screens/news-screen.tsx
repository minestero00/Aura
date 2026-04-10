import React from "react";
import { ActivityIndicator, Linking, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { HeroWaveDecoration } from "@components/hero-wave-decoration";
import type { AppCopy } from "@features/app/i18n";
import { createAppStyles, useAuraTheme } from "@features/app/styles";
import type { NewsArticle, NewsBriefing, NewsCategory } from "@features/news/types";

interface NewsScreenProps {
  copy: AppCopy;
  enabledCategories: NewsCategory[];
  isNewsLoading: boolean;
  labelCategory: (category: NewsCategory) => string;
  newsArticles: NewsArticle[];
  newsBriefing: NewsBriefing | null;
  onLoadDailyNewsBrief: () => Promise<void>;
}

export function NewsScreen({
  copy,
  enabledCategories,
  isNewsLoading,
  labelCategory,
  newsArticles,
  newsBriefing,
  onLoadDailyNewsBrief
}: NewsScreenProps) {
  const theme = useAuraTheme();
  const styles = createAppStyles(theme);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent} style={styles.scrollView}>
        <View style={styles.heroCard}>
          <HeroWaveDecoration />
          <View style={styles.heroForeground}>
            <Text style={styles.eyebrow}>{copy.news.eyebrow}</Text>
            <Text style={styles.title}>{copy.news.title}</Text>
            <Text style={styles.subtitle}>{copy.news.subtitle}</Text>
          </View>
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

          {newsArticles.map(article => (
            <Pressable
              key={article.id}
              onPress={() => void Linking.openURL(article.link)}
              style={styles.messageCard}
            >
              <Text style={styles.messageSubject}>{article.title}</Text>
              <Text style={styles.messageMeta}>
                {labelCategory(article.category)} · {article.source}
              </Text>
              <Text style={styles.messageMeta}>{article.publishedAt ?? copy.news.unknownTime}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
