import React from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { AuraLoader } from "@features/app/components/aura-loader";
import { BottomSheetModal } from "@features/app/components/bottom-sheet-modal";
import { createAppStyles, type AuraTheme } from "@features/app/styles";
import type { UseAuraAppResult } from "@features/app/types";

interface DailyBriefModalProps {
  app: UseAuraAppResult;
  theme: AuraTheme;
}

export function DailyBriefModal({ app, theme }: DailyBriefModalProps) {
  const styles = createAppStyles(theme);
  const hasEmail = Boolean(!app.isDailyBriefPreparing && app.dailyEmailDigest);
  const hasNews = Boolean(!app.isDailyBriefPreparing && app.newsBriefing);
  const hasNoContent = !app.isDailyBriefPreparing && !hasEmail && !hasNews;

  return (
    <BottomSheetModal
      visible={app.isDailyBriefModalVisible}
      onClose={app.handleCloseDailyBriefModal}
      sheetStyle={styles.modalCard}
    >
      <View style={styles.modalHandle} />
      <View style={styles.dailyBriefModalHeader}>
        <View style={styles.dailyBriefHeaderMain}>
          <Text style={styles.dailyBriefEyebrow}>AURA BRIEF</Text>
          <Text style={styles.dailyBriefTitle}>{app.copy.mail.dailyBriefTitle}</Text>
        </View>
        <Pressable onPress={app.handleCloseDailyBriefModal} style={styles.dailyBriefCloseButton}>
          <Text style={styles.dailyBriefCloseText}>×</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.dailyBriefBodyContent}
        style={styles.dailyBriefBodyScroll}
      >
        <Text style={styles.dailyBriefSubtitle}>{app.copy.mail.dailyBriefSubtitle}</Text>
        <View style={styles.dailyBriefMetaRow}>
          <View style={styles.dailyBriefMetaChip}>
            <Text style={styles.dailyBriefMetaChipText}>
              {hasEmail ? app.copy.mail.dailyBriefEmailLabel : "—"}
            </Text>
          </View>
          <View style={styles.dailyBriefMetaChip}>
            <Text style={styles.dailyBriefMetaChipText}>
              {hasNews ? app.copy.mail.dailyBriefNewsLabel : "—"}
            </Text>
          </View>
        </View>

        {app.isDailyBriefPreparing ? (
          <View style={styles.dailyBriefLoadingWrap}>
            <AuraLoader size="md" message={app.copy.mail.dailyBriefPreparing} />
          </View>
        ) : null}

        {hasEmail && app.dailyEmailDigest ? (
          <View style={styles.dailyBriefDigestCard}>
            <View style={styles.dailyBriefDigestHeader}>
              <Text style={styles.dailyBriefDigestIcon}>✉︎</Text>
              <Text style={styles.dailyBriefDigestLabel}>
                {app.copy.mail.dailyBriefEmailLabel}
              </Text>
            </View>
            <Text style={styles.dailyBriefDigestHeadline}>{app.dailyEmailDigest.headline}</Text>
            {app.dailyEmailDigest.bullets.map((bullet, index) => (
              <View key={`modal-email-${index}`} style={styles.dailyBriefBulletRow}>
                <Text style={styles.dailyBriefBulletDot}>•</Text>
                <Text style={styles.dailyBriefBulletText}>{bullet}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {hasNews && app.newsBriefing ? (
          <View style={styles.dailyBriefDigestCard}>
            <View style={styles.dailyBriefDigestHeader}>
              <Text style={styles.dailyBriefDigestIcon}>☰</Text>
              <Text style={styles.dailyBriefDigestLabel}>
                {app.copy.mail.dailyBriefNewsLabel}
              </Text>
            </View>
            <Text style={styles.dailyBriefDigestHeadline}>{app.newsBriefing.headline}</Text>
            {app.newsBriefing.bullets.map((bullet, index) => (
              <View key={`modal-news-${index}`} style={styles.dailyBriefBulletRow}>
                <Text style={styles.dailyBriefBulletDot}>•</Text>
                <Text style={styles.dailyBriefBulletText}>{bullet}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {!app.isDailyBriefPreparing && app.wellnessTip ? (
          <View style={styles.dailyBriefDigestCard}>
            <View style={styles.dailyBriefDigestHeader}>
              <Text style={styles.dailyBriefDigestIcon}>♡</Text>
              <Text style={styles.dailyBriefDigestLabel}>
                {app.copy.mail.dailyBriefWellnessLabel}
              </Text>
            </View>
            <Text style={styles.dailyBriefBulletText}>{app.wellnessTip}</Text>
          </View>
        ) : null}

        {hasNoContent ? (
          <Text style={styles.dailyBriefEmptyText}>{app.copy.mail.dailyBriefEmpty}</Text>
        ) : null}
      </ScrollView>
    </BottomSheetModal>
  );
}
