import React, { useMemo } from "react";
import { Pressable, Text, View } from "react-native";
import { useAuraTheme } from "@features/app/styles";
import { useTripTracker } from "@features/transit/hooks/use-trip-tracker";
import type { TransitTrip } from "@features/transit/types";
import { buildActiveTripBannerStyles } from "./ActiveTripBanner.styles";

interface ActiveTripBannerProps {
  trip: TransitTrip;
  onTripFinished: (status: "arrived" | "cancelled") => void;
}

export function ActiveTripBanner({ trip, onTripFinished }: ActiveTripBannerProps) {
  const theme = useAuraTheme();
  const styles = useMemo(() => buildActiveTripBannerStyles(theme), [theme]);
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
