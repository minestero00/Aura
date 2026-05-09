import React, { useEffect, useState } from "react";
import { Alert, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ActiveTripBanner,
  SearchTripScreen,
  getActiveTrip
} from "@features/transit";
import type { DirectionsOption, TransitTrip } from "@features/transit";
import type { CalendarAgendaDay } from "@features/calendar/types";
import { useAuraTheme } from "@features/app/styles";
import type { AppCopy, AppLanguage } from "@features/app/i18n";

interface TransitModalProps {
  visible: boolean;
  copy: AppCopy;
  language: AppLanguage;
  /** 캘린더에서 다음 일정을 자동 채워넣기 위한 source (현재 미사용 — Step 4에서 활용). */
  agendaDays: CalendarAgendaDay[];
  onDismiss: () => void;
}

/**
 * 버스 도착 알림 진입점. 활성 trip이 있으면 ActiveTripBanner, 없으면
 * SearchTripScreen(목적지 검색 + 옵션 선택). 옵션 선택 후 client-driven
 * trip 시작은 Step 3+에서 wiring — 지금은 dryRun(Alert).
 */
export function TransitModal({ visible, copy, language, onDismiss }: TransitModalProps) {
  const theme = useAuraTheme();
  const insets = useSafeAreaInsets();
  const [activeTrip, setActiveTrip] = useState<TransitTrip | null>(null);

  // modal이 열릴 때마다 active trip 조회 (legacy server-side trip — 다음 cleanup PR에서 제거).
  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    getActiveTrip()
      .then(result => {
        if (!cancelled) setActiveTrip(result.trip ?? null);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [visible]);

  function handleSelectOption(option: DirectionsOption) {
    // Step 3+에서 client-trip.ts AsyncStorage 저장 + Region Monitoring 등록.
    Alert.alert(
      language === "ko" ? "경로 선택됨 (개발 중)" : "Route selected (WIP)",
      language === "ko"
        ? `총 ${Math.round(option.totalDurationSec / 60)}분, 환승 ${option.transferCount}회. 다음 단계에서 trip 시작 + iOS Region Monitoring 등록 예정입니다.`
        : `${Math.round(option.totalDurationSec / 60)} min · ${option.transferCount} transfer. Trip start + iOS Region Monitoring will be wired in next step.`
    );
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onDismiss}
    >
      <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={copy.common.close}
          onPress={onDismiss}
          style={[
            styles.closeButton,
            {
              top: insets.top + 12,
              backgroundColor: theme.colors.surfaceMuted,
              borderColor: theme.colors.line
            }
          ]}
        >
          <Text style={[styles.closeLabel, { color: theme.colors.textSecondary }]}>×</Text>
        </Pressable>

        {activeTrip ? (
          <View style={[styles.bannerWrap, { paddingTop: insets.top + 64 }]}>
            <ActiveTripBanner
              trip={activeTrip}
              onTripFinished={() => {
                setActiveTrip(null);
                onDismiss();
              }}
            />
          </View>
        ) : (
          <SearchTripScreen
            language={language}
            onSelectOption={handleSelectOption}
            onCancel={onDismiss}
          />
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  closeButton: {
    position: "absolute",
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    zIndex: 50
  },
  closeLabel: { fontSize: 22, fontWeight: "700", lineHeight: 24 },
  bannerWrap: { padding: 20 }
});
