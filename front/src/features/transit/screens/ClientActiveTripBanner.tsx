import React, { useMemo } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useAuraTheme } from "@features/app/styles";
import { advanceActiveTripLeg, clearActiveTrip } from "../client-trip";
import type { ActiveTripState } from "../client-trip";
import type { DirectionsLeg } from "../types";
import { useGeofenceTracker } from "../use-geofence-tracker";
import { buildClientActiveTripBannerStyles } from "./ClientActiveTripBanner.styles";

interface ClientActiveTripBannerProps {
  trip: ActiveTripState;
  language: "ko" | "en";
  /** advance/end 후 새 trip state(또는 null=종료) 전달. */
  onChange: (next: ActiveTripState | null) => void;
  /** trip 종료 시 modal 닫음. */
  onClose: () => void;
}

interface BannerCopy {
  title: string;
  destinationArrow: string;
  nextLabel: string;
  advanceLast: string;
  advance: string;
  end: string;
  helper: string;
  helperWalking: string;
  helperBackgroundLimit: string;
  notificationDeniedHint: string;
  distanceLabel: (meters: number, stopName: string) => string;
  walk: string;
  bus: string;
  subway: string;
  train: string;
  transit: string;
  headsignSuffix: string;
  minutes: string;
  metersShort: string;
  stopsCount: (n: number) => string;
  legProgress: (i: number, total: number) => string;
}

const COPY: Record<"ko" | "en", BannerCopy> = {
  ko: {
    title: "경로 진행 중",
    destinationArrow: "→",
    nextLabel: "다음 단계",
    advanceLast: "도착 — 경로 완료",
    advance: "다음 단계로",
    end: "경로 종료",
    helper: "정류장에 가까워지면 자동으로 다음 단계로 넘어가요. 필요하면 수동으로 진행해도 됩니다.",
    helperWalking: "도보 구간은 도착 후 직접 \"다음 단계로\"를 눌러주세요.",
    helperBackgroundLimit: "현재 앱이 화면에 떠 있을 때만 위치를 확인합니다.",
    notificationDeniedHint: "알림 권한이 꺼져 있어 도착 알림이 표시되지 않을 수 있어요.",
    distanceLabel: (meters, stop) => `${stop}까지 약 ${meters}m`,
    walk: "도보",
    bus: "버스",
    subway: "지하철",
    train: "기차",
    transit: "대중교통",
    headsignSuffix: "방면",
    minutes: "분",
    metersShort: "m",
    stopsCount: (n: number) => `${n}정거장`,
    legProgress: (i: number, total: number) => `${i + 1} / ${total}`
  },
  en: {
    title: "Trip in progress",
    destinationArrow: "→",
    nextLabel: "Next step",
    advanceLast: "Arrived — finish trip",
    advance: "Advance step",
    end: "End trip",
    helper: "When you're near the stop, AURA advances automatically. You can also tap manually.",
    helperWalking: "On walking legs, tap \"Advance step\" once you arrive.",
    helperBackgroundLimit: "Location is only checked while the app is in the foreground.",
    notificationDeniedHint: "Notification permission is off — arrival alerts may not show.",
    distanceLabel: (meters, stop) => `~${meters}m to ${stop}`,
    walk: "Walk",
    bus: "Bus",
    subway: "Subway",
    train: "Train",
    transit: "Transit",
    headsignSuffix: "bound",
    minutes: "min",
    metersShort: "m",
    stopsCount: (n: number) => `${n} stops`,
    legProgress: (i: number, total: number) => `${i + 1} / ${total}`
  }
};

interface LegSummary {
  icon: string;
  primary: string;
  secondary: string | null;
  meta: string | null;
}

function summarizeLeg(leg: DirectionsLeg, t: BannerCopy): LegSummary {
  if (leg.mode === "walking") {
    const minutes = Math.max(1, Math.round(leg.durationSec / 60));
    return {
      icon: "🚶",
      primary: t.walk,
      secondary: null,
      meta: `${minutes}${t.minutes} · ${leg.distanceMeters}${t.metersShort}`
    };
  }
  const kind = leg.transitKind?.toUpperCase() ?? "";
  const isSubway = kind === "SUBWAY" || kind === "HEAVY_RAIL" || kind === "METRO_RAIL";
  const isTrain = kind === "RAIL" || kind === "COMMUTER_TRAIN" || kind === "HIGH_SPEED_TRAIN";
  const icon = isSubway ? "🚇" : isTrain ? "🚆" : "🚌";
  const lineLabel =
    leg.lineShort ?? leg.lineName ?? (isSubway ? t.subway : isTrain ? t.train : t.bus);
  const headsign = leg.headsign ? `${leg.headsign} ${t.headsignSuffix}` : null;
  const minutes = Math.max(1, Math.round(leg.durationSec / 60));
  const stops = t.stopsCount(leg.numStops);
  const route = `${leg.departureStop.name} → ${leg.arrivalStop.name}`;
  return {
    icon,
    primary: headsign ? `${lineLabel} · ${headsign}` : lineLabel,
    secondary: route,
    meta: `${stops} · ${minutes}${t.minutes}`
  };
}

export function ClientActiveTripBanner({
  trip,
  language,
  onChange,
  onClose
}: ClientActiveTripBannerProps) {
  const theme = useAuraTheme();
  const styles = useMemo(() => buildClientActiveTripBannerStyles(theme), [theme]);
  const t = COPY[language];

  const geofence = useGeofenceTracker({ trip, language, onChange });

  const currentLeg = trip.legs[trip.currentLegIndex];
  const nextLeg = trip.legs[trip.currentLegIndex + 1];
  const isLastLeg = trip.currentLegIndex >= trip.legs.length - 1;
  const isWalkingLeg = currentLeg?.mode === "walking";

  async function handleAdvance() {
    const next = await advanceActiveTripLeg();
    onChange(next);
    if (!next) onClose();
  }

  async function handleEnd() {
    await clearActiveTrip();
    onChange(null);
    onClose();
  }

  if (!currentLeg) {
    // 비정상 상태 — leg가 비어있으면 종료만 노출
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>{t.title}</Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => void handleEnd()}
          style={styles.endButton}
        >
          <Text style={styles.endButtonText}>{t.end}</Text>
        </Pressable>
      </ScrollView>
    );
  }

  const currentSummary = summarizeLeg(currentLeg, t);
  const nextSummary = nextLeg ? summarizeLeg(nextLeg, t) : null;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>{t.title}</Text>
      <View style={styles.destinationRow}>
        <Text style={styles.destinationArrow}>{t.destinationArrow}</Text>
        <Text style={styles.destinationText}>{trip.destinationLabel}</Text>
      </View>

      <View style={styles.progressRow}>
        {trip.legs.map((_, index) => {
          const done = index < trip.currentLegIndex;
          const active = index === trip.currentLegIndex;
          return (
            <React.Fragment key={`step-${index}`}>
              <View
                style={[
                  styles.progressDot,
                  done ? styles.progressDotDone : null,
                  active ? styles.progressDotActive : null
                ]}
              />
              {index < trip.legs.length - 1 ? (
                <View
                  style={[
                    styles.progressBar,
                    index < trip.currentLegIndex ? styles.progressBarDone : null
                  ]}
                />
              ) : null}
            </React.Fragment>
          );
        })}
      </View>

      <View style={styles.currentCard}>
        <View style={styles.currentHeader}>
          <Text style={styles.currentIcon}>{currentSummary.icon}</Text>
          <Text style={styles.currentTitle}>{currentSummary.primary}</Text>
        </View>
        {currentSummary.secondary ? (
          <Text style={styles.currentSubtitle}>{currentSummary.secondary}</Text>
        ) : null}
        {currentSummary.meta ? (
          <Text style={styles.currentMeta}>
            {currentSummary.meta} · {t.legProgress(trip.currentLegIndex, trip.legs.length)}
          </Text>
        ) : (
          <Text style={styles.currentMeta}>
            {t.legProgress(trip.currentLegIndex, trip.legs.length)}
          </Text>
        )}
        {geofence.active && geofence.distanceMeters != null && geofence.targetStopName ? (
          <Text style={styles.currentMeta}>
            {t.distanceLabel(geofence.distanceMeters, geofence.targetStopName)}
          </Text>
        ) : null}
      </View>

      {nextSummary ? (
        <View style={styles.nextLegHint}>
          <Text style={styles.nextLegLabel}>{t.nextLabel}</Text>
          <Text style={styles.nextLegText}>
            {nextSummary.icon} {nextSummary.primary}
            {nextSummary.meta ? ` · ${nextSummary.meta}` : ""}
          </Text>
        </View>
      ) : null}

      <View style={styles.buttonRow}>
        <Pressable
          accessibilityRole="button"
          onPress={() => void handleAdvance()}
          style={styles.advanceButton}
        >
          <Text style={styles.advanceButtonText}>
            {isLastLeg ? t.advanceLast : t.advance}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => void handleEnd()}
          style={styles.endButton}
        >
          <Text style={styles.endButtonText}>{t.end}</Text>
        </Pressable>
      </View>

      <Text style={styles.helperText}>
        {isWalkingLeg ? t.helperWalking : t.helper}
      </Text>
      <Text style={styles.helperText}>{t.helperBackgroundLimit}</Text>
      {geofence.notificationDenied ? (
        <Text style={styles.helperText}>{t.notificationDeniedHint}</Text>
      ) : null}
    </ScrollView>
  );
}
