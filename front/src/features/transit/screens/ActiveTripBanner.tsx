import React, { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useAuraTheme, type AuraTheme } from "@features/app/styles";
import { useTripTracker } from "@features/transit/hooks/use-trip-tracker";
import type { TransitTrip } from "@features/transit/types";

interface ActiveTripBannerProps {
  trip: TransitTrip;
  onTripFinished: (status: "arrived" | "cancelled") => void;
}

function buildStyles(theme: AuraTheme) {
  const { colors } = theme;
  return StyleSheet.create({
    container: {
      borderRadius: 18,
      borderWidth: 1,
      padding: 14,
      gap: 8
    },
    containerNormal: {
      borderColor: colors.lineStrong,
      backgroundColor: colors.surface
    },
    containerUrgent: {
      borderColor: "#FF3B5C",
      backgroundColor: "#FFEAEE"
    },
    label: {
      color: colors.textMuted,
      fontSize: 12,
      fontWeight: "700",
      textTransform: "uppercase",
      letterSpacing: 0.5
    },
    routeText: { color: colors.textPrimary, fontSize: 18, fontWeight: "800" },
    metaText: { color: colors.textSecondary, fontSize: 14 },
    statBlock: { flexDirection: "row", alignItems: "baseline", gap: 6 },
    statValue: {
      color: colors.textPrimary,
      fontSize: 28,
      fontWeight: "800",
      fontVariant: ["tabular-nums"]
    },
    statValueUrgent: { color: "#FF3B5C" },
    statUnit: { color: colors.textSecondary, fontSize: 14, fontWeight: "700" },
    actions: { flexDirection: "row", gap: 8, marginTop: 8 },
    cancelButton: {
      flex: 1,
      minHeight: 40,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: colors.lineStrong,
      backgroundColor: colors.surfaceMuted
    },
    cancelButtonText: { color: colors.textSecondary, fontSize: 13, fontWeight: "700" },
    helperText: { color: colors.textMuted, fontSize: 12 }
  });
}

export function ActiveTripBanner({ trip, onTripFinished }: ActiveTripBannerProps) {
  const theme = useAuraTheme();
  const styles = useMemo(() => buildStyles(theme), [theme]);
  const tracker = useTripTracker({
    trip,
    onArrived: () => onTripFinished("arrived")
  });

  const remaining = tracker.lastResult?.remainingStops ?? trip.lastRemainingStops ?? null;
  const eta = tracker.lastResult?.etaSeconds ?? trip.lastEtaSeconds ?? null;
  const urgent = remaining !== null && remaining <= 1;

  async function handleCancel() {
    await tracker.stop("cancelled");
    onTripFinished("cancelled");
  }

  return (
    <View style={[styles.container, urgent ? styles.containerUrgent : styles.containerNormal]}>
      <Text style={styles.label}>운행 중</Text>
      <Text style={styles.routeText}>
        {trip.mode === "bus" ? "버스" : "지하철"} · {trip.routeName}
      </Text>
      <Text style={styles.metaText}>도착 정류장: {trip.destinationStopName}</Text>

      <View style={styles.statBlock}>
        <Text style={[styles.statValue, urgent && styles.statValueUrgent]}>
          {remaining ?? "-"}
        </Text>
        <Text style={styles.statUnit}>정거장</Text>
        {eta !== null ? (
          <Text style={styles.statUnit}>· {Math.max(0, Math.round(eta / 60))}분</Text>
        ) : null}
      </View>

      {!tracker.permissionGranted ? (
        <Text style={styles.helperText}>
          위치 권한이 필요합니다. 권한을 허용해야 정확한 알림이 발송됩니다.
        </Text>
      ) : null}
      {tracker.error ? (
        <Text style={styles.helperText}>네트워크 문제로 갱신이 지연되고 있습니다.</Text>
      ) : null}

      <View style={styles.actions}>
        <Pressable style={styles.cancelButton} onPress={handleCancel} accessibilityRole="button">
          <Text style={styles.cancelButtonText}>탑승 종료</Text>
        </Pressable>
      </View>
    </View>
  );
}
