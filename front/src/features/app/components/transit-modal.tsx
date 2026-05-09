import React, { useEffect, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ClientActiveTripBanner,
  SearchTripScreen,
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
  /** 추후 SearchTrip prefill에 활용(다음 일정 location). */
  agendaDays: CalendarAgendaDay[];
  onDismiss: () => void;
}

/**
 * Client-driven 버스 도착 알림 진입점.
 * - active trip(AsyncStorage) 있으면 ClientActiveTripBanner.
 * - 없으면 SearchTripScreen → 옵션 선택 시 client-trip 저장 + banner로 전환.
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

        <View style={[styles.body, { paddingTop: insets.top + 56 }]}>
          {activeTrip ? (
            <ClientActiveTripBanner
              trip={activeTrip}
              language={language}
              onChange={setActiveTrip}
              onClose={onDismiss}
            />
          ) : (
            <SearchTripScreen
              language={language}
              onSelectOption={handleSelectOption}
              onCancel={onDismiss}
            />
          )}
        </View>
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
  body: { flex: 1 }
});
