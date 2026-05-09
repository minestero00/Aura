import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getDailyBriefNotificationStatus,
  scheduleDailyBriefingNotification,
} from '@features/app/notifications';
import type { AppLanguage } from '@features/app/i18n';
import { useAuraTheme } from '@features/app/styles';
import { buildPushOnboardingModalStyles } from './PushOnboardingModal.styles';

const STORAGE_KEY = 'aura.push.onboarding.shown';

interface PushOnboardingModalProps {
  language: AppLanguage;
}

export function PushOnboardingModal({ language }: PushOnboardingModalProps) {
  const theme = useAuraTheme();
  const styles = useMemo(() => buildPushOnboardingModalStyles(theme), [theme]);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const shown = await AsyncStorage.getItem(STORAGE_KEY);
        if (shown === '1') {
          return;
        }
        const status = await getDailyBriefNotificationStatus();
        if (cancelled) return;
        if (!status.permissionGranted) {
          setVisible(true);
        } else {
          await AsyncStorage.setItem(STORAGE_KEY, '1');
        }
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function dismiss(reason: 'accepted' | 'skipped') {
    setVisible(false);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, '1');
    } catch {
      // ignore
    }
    if (reason === 'accepted') {
      try {
        await scheduleDailyBriefingNotification(language);
      } catch {
        // ignore
      }
    }
  }

  const copy =
    language === 'ko'
      ? {
          title: 'AURA의 알림을 켜주세요',
          body: '오늘의 브리핑과 정류장 도착 알림을 놓치지 않으려면 알림 권한이 필요합니다. 한 번만 허용해주세요.',
          accept: '알림 켜기',
          skip: '다음에',
        }
      : {
          title: 'Turn on AURA notifications',
          body: 'Allow notifications so you never miss your daily briefing or transit arrival alerts.',
          accept: 'Enable notifications',
          skip: 'Maybe later',
        };

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={() => dismiss('skipped')}
    >
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>{copy.title}</Text>
          <Text style={styles.body}>{copy.body}</Text>
          <Pressable
            style={styles.primary}
            onPress={() => dismiss('accepted')}
            accessibilityRole="button"
          >
            <Text style={styles.primaryText}>{copy.accept}</Text>
          </Pressable>
          <Pressable
            style={styles.secondary}
            onPress={() => dismiss('skipped')}
            accessibilityRole="button"
          >
            <Text style={styles.secondaryText}>{copy.skip}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
