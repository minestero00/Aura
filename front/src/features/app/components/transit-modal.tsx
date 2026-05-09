import React, { useEffect, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  SearchTripScreen,
  clearActiveTrip,
  createActiveTripFromOption,
  loadActiveTrip,
  saveActiveTrip
} from "@features/transit";
import type { ActiveTripState, DirectionsOption } from "@features/transit";
import type { CalendarAgendaDay } from "@features/calendar/types";
import { useAuraTheme } from "@features/app/styles";
import type { AppCopy, AppLanguage } from "@features/app/i18n";

interface TransitModalProps {
  visible: boolean;
  copy: AppCopy;
  language: AppLanguage;
  /** Step 4+에서 활용 — 캘린더 다음 일정 location 자동 채움. */
  agendaDays: CalendarAgendaDay[];
  onDismiss: () => void;
}

/**
 * Client-driven 버스 도착 알림 진입점.
 * - active trip(AsyncStorage)이 있으면 임시 progress 카드(Step 4에서 정식
 *   ClientActiveTripBanner로 교체).
 * - 없으면 SearchTripScreen → 옵션 선택 시 client-trip 저장.
 *
 * 서버 transit_trips 호출은 모두 제거 — schema 누락 + client-driven 정책.
 */
export function TransitModal({ visible, copy, language, onDismiss }: TransitModalProps) {
  const theme = useAuraTheme();
  const insets = useSafeAreaInsets();
  const [activeTrip, setActiveTrip] = useState<ActiveTripState | null>(null);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    void loadActiveTrip().then(trip => {
      if (!cancelled) setActiveTrip(trip);
    });
    return () => {
      cancelled = true;
    };
  }, [visible]);

  async function handleSelectOption(option: DirectionsOption, destinationLabel: string) {
    const trip = createActiveTripFromOption(option, destinationLabel || "Trip");
    await saveActiveTrip(trip);
    setActiveTrip(trip);
  }

  async function handleEndTrip() {
    await clearActiveTrip();
    setActiveTrip(null);
    onDismiss();
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
          <ScrollView
            contentContainerStyle={[
              styles.bannerWrap,
              { paddingTop: insets.top + 64 }
            ]}
          >
            <Text style={[styles.bannerTitle, { color: theme.colors.textPrimary }]}>
              {language === "ko" ? "진행 중인 경로" : "Active trip"}
            </Text>
            <Text style={[styles.bannerSubtitle, { color: theme.colors.textSecondary }]}>
              → {activeTrip.destinationLabel}
            </Text>
            <Text style={[styles.bannerHint, { color: theme.colors.textMuted }]}>
              {language === "ko"
                ? `진행 leg ${activeTrip.currentLegIndex + 1} / ${activeTrip.legs.length} · iOS Region Monitoring 알림은 Step 5+에서 활성화됩니다.`
                : `Leg ${activeTrip.currentLegIndex + 1} / ${activeTrip.legs.length} · iOS Region Monitoring alerts will be wired in Step 5+.`}
            </Text>

            <Pressable
              accessibilityRole="button"
              onPress={() => void handleEndTrip()}
              style={[
                styles.endButton,
                { backgroundColor: theme.colors.dangerSoft }
              ]}
            >
              <Text style={[styles.endButtonText, { color: theme.colors.dangerText }]}>
                {language === "ko" ? "경로 종료" : "End trip"}
              </Text>
            </Pressable>
          </ScrollView>
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
  bannerWrap: { paddingHorizontal: 20, paddingBottom: 40, gap: 10 },
  bannerTitle: { fontSize: 20, fontWeight: "800" },
  bannerSubtitle: { fontSize: 15, lineHeight: 22 },
  bannerHint: { fontSize: 12, lineHeight: 18, marginTop: 4 },
  endButton: {
    marginTop: 16,
    minHeight: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center"
  },
  endButtonText: { fontSize: 14, fontWeight: "800" }
});
