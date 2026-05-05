import React, { useEffect, useMemo, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  getDailyBriefNotificationStatus,
  scheduleDailyBriefingNotification
} from "@features/app/notifications";
import type { AppLanguage } from "@features/app/i18n";
import { useAuraTheme, type AuraTheme } from "@features/app/styles";

const STORAGE_KEY = "aura.push.onboarding.shown";

interface PushOnboardingModalProps {
  language: AppLanguage;
}

function buildStyles(theme: AuraTheme) {
  const { colors } = theme;
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: colors.overlay,
      justifyContent: "center",
      padding: 20
    },
    card: {
      borderRadius: 28,
      backgroundColor: colors.surface,
      padding: 24,
      gap: 14
    },
    title: { color: colors.textPrimary, fontSize: 20, fontWeight: "800" },
    body: { color: colors.textSecondary, fontSize: 15, lineHeight: 22 },
    primary: {
      minHeight: 48,
      borderRadius: 14,
      backgroundColor: colors.accent,
      alignItems: "center",
      justifyContent: "center"
    },
    primaryText: { color: colors.accentText, fontSize: 15, fontWeight: "800" },
    secondary: {
      minHeight: 44,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.lineStrong,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.surfaceMuted
    },
    secondaryText: { color: colors.textSecondary, fontSize: 14, fontWeight: "700" }
  });
}

export function PushOnboardingModal({ language }: PushOnboardingModalProps) {
  const theme = useAuraTheme();
  const styles = useMemo(() => buildStyles(theme), [theme]);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const shown = await AsyncStorage.getItem(STORAGE_KEY);
        if (shown === "1") {
          return;
        }
        const status = await getDailyBriefNotificationStatus();
        if (cancelled) return;
        if (!status.permissionGranted) {
          setVisible(true);
        } else {
          await AsyncStorage.setItem(STORAGE_KEY, "1");
        }
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function dismiss(reason: "accepted" | "skipped") {
    setVisible(false);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // ignore
    }
    if (reason === "accepted") {
      try {
        await scheduleDailyBriefingNotification(language);
      } catch {
        // ignore
      }
    }
  }

  const copy =
    language === "ko"
      ? {
          title: "Aura의 알림을 켜주세요",
          body: "오늘의 브리핑과 버스 도착 알림을 놓치지 않으려면 알림 권한이 필요합니다. 한 번만 허용해주세요.",
          accept: "알림 켜기",
          skip: "다음에"
        }
      : {
          title: "Turn on Aura notifications",
          body: "Allow notifications so you never miss your daily briefing or transit arrival alerts.",
          accept: "Enable notifications",
          skip: "Maybe later"
        };

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={() => dismiss("skipped")}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>{copy.title}</Text>
          <Text style={styles.body}>{copy.body}</Text>
          <Pressable style={styles.primary} onPress={() => dismiss("accepted")} accessibilityRole="button">
            <Text style={styles.primaryText}>{copy.accept}</Text>
          </Pressable>
          <Pressable style={styles.secondary} onPress={() => dismiss("skipped")} accessibilityRole="button">
            <Text style={styles.secondaryText}>{copy.skip}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
