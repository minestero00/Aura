import React from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, View } from "react-native";
import { createAppStyles, type AuraTheme } from "@features/app/styles";
import type { UseAuraAppResult } from "@features/app/types";

interface DailyBriefModalProps {
  app: UseAuraAppResult;
  theme: AuraTheme;
}

export function DailyBriefModal({ app, theme }: DailyBriefModalProps) {
  const styles = createAppStyles(theme);

  return (
    <Modal animationType="fade" transparent visible={app.isDailyBriefModalVisible}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <ScrollView contentContainerStyle={styles.modalScrollContent}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.sectionTitle}>{app.copy.mail.dailyBriefTitle}</Text>
              <Pressable onPress={app.handleCloseDailyBriefModal} style={styles.modalCloseButton}>
                <Text style={styles.modalCloseText}>×</Text>
              </Pressable>
            </View>
            <Text style={styles.helperText}>{app.copy.mail.dailyBriefSubtitle}</Text>

            {app.isDailyBriefPreparing ? (
              <View style={styles.modalLoadingWrap}>
                <ActivityIndicator color={theme.colors.textPrimary} />
                <Text style={styles.inlineLoadingText}>{app.copy.mail.dailyBriefPreparing}</Text>
              </View>
            ) : null}

            {!app.isDailyBriefPreparing && app.dailyEmailDigest ? (
              <View style={styles.compactDigestCard}>
                <Text style={styles.digestLabel}>{app.copy.mail.dailyBriefEmailLabel}</Text>
                <Text style={styles.compactDigestHeadline}>{app.dailyEmailDigest.headline}</Text>
                {app.dailyEmailDigest.bullets.map((bullet, index) => (
                  <Text key={`modal-email-${index}`} style={styles.digestBullet}>
                    • {bullet}
                  </Text>
                ))}
              </View>
            ) : null}

            {!app.isDailyBriefPreparing && app.newsBriefing ? (
              <View style={styles.compactDigestCard}>
                <Text style={styles.digestLabel}>{app.copy.mail.dailyBriefNewsLabel}</Text>
                <Text style={styles.compactDigestHeadline}>{app.newsBriefing.headline}</Text>
                {app.newsBriefing.bullets.map((bullet, index) => (
                  <Text key={`modal-news-${index}`} style={styles.digestBullet}>
                    • {bullet}
                  </Text>
                ))}
              </View>
            ) : null}

            {!app.isDailyBriefPreparing && !app.dailyEmailDigest && !app.newsBriefing ? (
              <Text style={styles.helperText}>{app.copy.mail.dailyBriefEmpty}</Text>
            ) : null}

            <View style={styles.modalActionRow}>
              <Pressable
                onPress={() => void app.handleRefreshDailyBrief()}
                style={[styles.modalActionButton, styles.modalActionButtonPrimary]}
              >
                <Text style={[styles.modalActionButtonText, styles.modalActionButtonTextPrimary]}>
                  {app.copy.mail.dailyBriefRefresh}
                </Text>
              </Pressable>

              <Pressable onPress={app.handleOpenMailFromDailyBrief} style={styles.modalActionButton}>
                <Text style={styles.modalActionButtonText}>{app.copy.mail.dailyBriefOpenMail}</Text>
              </Pressable>

              <Pressable onPress={app.handleOpenNewsFromDailyBrief} style={styles.modalActionButton}>
                <Text style={styles.modalActionButtonText}>{app.copy.mail.dailyBriefOpenNews}</Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
