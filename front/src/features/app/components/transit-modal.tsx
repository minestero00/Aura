import React, { useEffect, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ActiveTripBanner, StartTripScreen, getActiveTrip } from "@features/transit";
import type { TransitTrip } from "@features/transit";
import type { CalendarAgendaEvent, CalendarAgendaDay } from "@features/calendar/types";
import { useAuraTheme } from "@features/app/styles";
import type { AppCopy } from "@features/app/i18n";

interface TransitModalProps {
  visible: boolean;
  copy: AppCopy;
  /** 캘린더에서 다음 일정을 자동 채워넣기 위한 source. */
  agendaDays: CalendarAgendaDay[];
  onDismiss: () => void;
}

/**
 * 버스 도착 알림 진입점. 활성 trip이 있으면 ActiveTripBanner, 없으면
 * StartTripScreen으로 분기. trip 시작/종료 모두 modal 안에서 처리.
 */
export function TransitModal({ visible, copy, agendaDays, onDismiss }: TransitModalProps) {
  const theme = useAuraTheme();
  const insets = useSafeAreaInsets();
  const [activeTrip, setActiveTrip] = useState<TransitTrip | null>(null);

  // modal이 열릴 때마다 active trip을 backend에서 한 번 조회 — 다른 device에서
  // 시작했거나 앱 재실행 후에도 진행 중인 trip 확인.
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

  // 캘린더의 가장 가까운 미래 일정 — StartTrip 화면이 자동 destination 채움.
  const nextEvent = pickNextLocatedEvent(agendaDays);

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
          <StartTripScreen
            nextEvent={nextEvent ?? null}
            destinationLocation={null}
            onTripStarted={trip => setActiveTrip(trip)}
            onCancel={onDismiss}
          />
        )}
      </View>
    </Modal>
  );
}

function pickNextLocatedEvent(days: CalendarAgendaDay[]): CalendarAgendaEvent | null {
  const now = Date.now();
  for (const day of days) {
    for (const event of day.events) {
      const startsAtMs = new Date(event.startsAt).getTime();
      if (Number.isNaN(startsAtMs)) continue;
      if (startsAtMs < now) continue;
      if (!event.location) continue;
      return event;
    }
  }
  return null;
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
