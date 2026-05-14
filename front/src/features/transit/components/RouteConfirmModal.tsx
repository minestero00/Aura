import polyline from "@mapbox/polyline";
import React, { useMemo, useRef } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import MapView, {
  Marker,
  PROVIDER_DEFAULT,
  Polyline,
  type LatLng
} from "react-native-maps";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuraTheme } from "@features/app/styles";
import type { DirectionsLeg, DirectionsOption } from "@features/transit/types";

interface RouteConfirmModalProps {
  visible: boolean;
  option: DirectionsOption | null;
  destinationLabel: string;
  language: "ko" | "en";
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * 검색 결과 옵션을 지도에 표시해 사용자가 "이 경로 사용"으로 명시 확인.
 *
 * 각 leg.polyline을 decode → 색깔별로 분리해 표시:
 * - walking: 회색 점선 효과 (얇음 + lineDash)
 * - transit: 강조 색
 * 지도 영역은 모든 좌표를 fit. 출발(첫 leg의 시작)과 도착(마지막 leg의 끝)에 marker.
 *
 * iOS: PROVIDER_DEFAULT → Apple Maps (Google Maps API key 불필요).
 * Android: PROVIDER_DEFAULT → Google Maps native (Play Services 필요).
 */
export function RouteConfirmModal({
  visible,
  option,
  destinationLabel,
  language,
  onConfirm,
  onCancel
}: RouteConfirmModalProps) {
  const theme = useAuraTheme();
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView | null>(null);

  const segments = useMemo(() => decodeOptionToSegments(option), [option]);
  const startEnd = useMemo(() => extractStartEnd(option), [option]);

  function handleMapReady() {
    if (!mapRef.current) return;
    const all = segments.flatMap(s => s.coords);
    if (all.length < 2) return;
    mapRef.current.fitToCoordinates(all, {
      edgePadding: { top: 80, right: 60, bottom: 240, left: 60 },
      animated: false
    });
  }

  if (!visible || !option) return null;

  const totalMin = Math.round(option.totalDurationSec / 60);
  const isKo = language === "ko";

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onCancel}
    >
      <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
        <MapView
          ref={mapRef}
          provider={PROVIDER_DEFAULT}
          style={StyleSheet.absoluteFill}
          showsUserLocation
          showsMyLocationButton={false}
          onMapReady={handleMapReady}
        >
          {segments.map((seg, idx) => (
            <Polyline
              key={`seg-${idx}`}
              coordinates={seg.coords}
              strokeColor={
                seg.mode === "walking" ? theme.colors.textMuted : theme.colors.accent
              }
              strokeWidth={seg.mode === "walking" ? 4 : 6}
              lineDashPattern={seg.mode === "walking" ? [4, 6] : undefined}
            />
          ))}
          {startEnd.start ? (
            <Marker
              coordinate={startEnd.start}
              pinColor="#3b82f6"
              title={isKo ? "출발" : "Start"}
            />
          ) : null}
          {startEnd.end ? (
            <Marker
              coordinate={startEnd.end}
              pinColor="#ef4444"
              title={destinationLabel || (isKo ? "도착" : "Destination")}
            />
          ) : null}
        </MapView>

        <Pressable
          onPress={onCancel}
          style={[
            styles.closeBtn,
            {
              top: insets.top + 12,
              backgroundColor: theme.colors.elevated,
              borderColor: theme.colors.line
            }
          ]}
          accessibilityRole="button"
        >
          <Text style={[styles.closeIcon, { color: theme.colors.textSecondary }]}>×</Text>
        </Pressable>

        <View
          style={[
            styles.bottomCard,
            {
              paddingBottom: insets.bottom + 16,
              backgroundColor: theme.colors.elevated,
              borderColor: theme.colors.line
            }
          ]}
        >
          <Text style={[styles.cardTitle, { color: theme.colors.textPrimary }]}>
            {destinationLabel || (isKo ? "경로 확인" : "Confirm route")}
          </Text>
          <Text style={[styles.cardMeta, { color: theme.colors.textSecondary }]}>
            {isKo
              ? `약 ${totalMin}분 · 환승 ${option.transferCount}회`
              : `~${totalMin} min · ${option.transferCount} transfers`}
          </Text>

          <View style={styles.cardButtons}>
            <Pressable
              onPress={onCancel}
              style={[
                styles.secondaryBtn,
                { backgroundColor: theme.colors.surfaceMuted }
              ]}
              accessibilityRole="button"
            >
              <Text style={[styles.secondaryText, { color: theme.colors.textSecondary }]}>
                {isKo ? "다른 경로" : "Other"}
              </Text>
            </Pressable>
            <Pressable
              onPress={onConfirm}
              style={[styles.primaryBtn, { backgroundColor: theme.colors.accent }]}
              accessibilityRole="button"
            >
              <Text style={[styles.primaryText, { color: theme.colors.accentText }]}>
                {isKo ? "이 경로 사용" : "Use this route"}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

interface DecodedSegment {
  mode: DirectionsLeg["mode"];
  coords: LatLng[];
}

function decodeOptionToSegments(option: DirectionsOption | null): DecodedSegment[] {
  if (!option) return [];
  const out: DecodedSegment[] = [];
  for (const leg of option.legs) {
    if (!leg.polyline) continue;
    try {
      const decoded = polyline.decode(leg.polyline) as Array<[number, number]>;
      const coords: LatLng[] = decoded.map(([lat, lng]) => ({ latitude: lat, longitude: lng }));
      if (coords.length >= 2) out.push({ mode: leg.mode, coords });
    } catch {
      // 잘못된 polyline은 skip — 다른 leg는 표시.
    }
  }
  return out;
}

function extractStartEnd(option: DirectionsOption | null): {
  start: LatLng | null;
  end: LatLng | null;
} {
  if (!option || option.legs.length === 0) return { start: null, end: null };
  const segments = decodeOptionToSegments(option);
  if (segments.length === 0) return { start: null, end: null };
  const first = segments[0].coords;
  const last = segments[segments.length - 1].coords;
  return {
    start: first[0] ?? null,
    end:
      option.endLocation != null
        ? { latitude: option.endLocation.lat, longitude: option.endLocation.lng }
        : last[last.length - 1] ?? null
  };
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  closeBtn: {
    position: "absolute",
    left: 16,
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    zIndex: 50
  },
  closeIcon: { fontSize: 22, fontWeight: "700", lineHeight: 24 },
  bottomCard: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderTopWidth: 1,
    gap: 6
  },
  cardTitle: { fontSize: 17, fontWeight: "800" },
  cardMeta: { fontSize: 13, marginBottom: 8 },
  cardButtons: { flexDirection: "row", gap: 10 },
  secondaryBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center"
  },
  secondaryText: { fontSize: 15, fontWeight: "700" },
  primaryBtn: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center"
  },
  primaryText: { fontSize: 15, fontWeight: "800" }
});
