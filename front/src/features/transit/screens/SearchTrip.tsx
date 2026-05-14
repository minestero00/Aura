import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View
} from "react-native";
import { useAuraTheme } from "@features/app/styles";
import { fetchDirections, fetchPlacesCandidates, type PlaceCandidate } from "@features/transit/api";
import { DestinationConfirmModal } from "@features/transit/components/DestinationConfirmModal";
import { getCurrentDeviceLocation } from "@features/location/current-location";
import type { DirectionsLeg, DirectionsOption } from "@features/transit/types";
import { buildSearchTripStyles } from "./SearchTrip.styles";

interface SearchTripScreenProps {
  language: "ko" | "en";
  /** 옵션 선택 콜백 — caller가 createActiveTripFromOption + saveActiveTrip. */
  onSelectOption: (option: DirectionsOption, destinationLabel: string) => void;
  /** "닫기" 버튼 표시 + 콜백. settings sub-section 안에서는 헤더의 back 버튼이 대신
   * 하므로 미지정. modal 진입(legacy)에서는 지정해 fallback. */
  onCancel?: () => void;
}

type TransitLeg = Extract<DirectionsLeg, { mode: "transit" }>;
type WalkingLeg = Extract<DirectionsLeg, { mode: "walking" }>;

/**
 * Client-driven transit의 진입 화면. 사용자가 목적지를 입력하면 backend
 * Directions로 경로 옵션 N개를 받아 네이버 지도 스타일 timeline 카드로 표시.
 */
export function SearchTripScreen({ language, onSelectOption, onCancel }: SearchTripScreenProps) {
  const theme = useAuraTheme();
  const styles = useMemo(() => buildSearchTripStyles(theme), [theme]);

  const [destination, setDestination] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [options, setOptions] = useState<DirectionsOption[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  // 목적지 후보 확정 step — 후보가 2+개일 때 DestinationConfirmModal 띄움.
  const [pendingCandidates, setPendingCandidates] = useState<PlaceCandidate[]>([]);
  const [pendingQuery, setPendingQuery] = useState<string>("");

  async function runDirections(
    originLat: number,
    originLng: number,
    destinationStr: string
  ) {
    try {
      const result = await fetchDirections({
        originLat,
        originLng,
        destination: destinationStr,
        language
      });
      setOptions(result.options);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed";
      setErrorMessage(
        language === "ko"
          ? `경로를 받지 못했어요: ${message}`
          : `Couldn't load directions: ${message}`
      );
    }
  }

  async function handleSearch() {
    const trimmed = destination.trim();
    if (!trimmed) return;
    setIsSearching(true);
    setErrorMessage(null);
    setOptions([]);
    setHasSearched(true);
    try {
      const location = await getCurrentDeviceLocation();
      if (location.kind !== "ok") {
        setErrorMessage(
          language === "ko"
            ? "위치 권한이 없거나 현재 위치를 받지 못해 경로를 찾을 수 없어요."
            : "Couldn't get your location. Allow location permission and try again."
        );
        return;
      }

      // Step 1: 목적지 후보 검색. 모호한 질의("현대아파트")에 대해 다중 후보.
      const placesResult = await fetchPlacesCandidates({
        query: trimmed,
        language,
        origin: { lat: location.lat, lng: location.lng }
      });
      const candidates = placesResult.candidates;

      if (candidates.length === 0) {
        setErrorMessage(
          language === "ko"
            ? "검색 결과가 없어요. 다른 단어로 시도해 보세요."
            : "No results. Try a different query."
        );
        return;
      }

      // Step 2: 후보가 하나면 그대로 directions. 여러 개면 사용자에게 확인.
      if (candidates.length === 1) {
        const c = candidates[0];
        await runDirections(location.lat, location.lng, `${c.lat},${c.lng}`);
        return;
      }
      setPendingCandidates(candidates);
      setPendingQuery(trimmed);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed";
      setErrorMessage(
        language === "ko"
          ? `목적지를 찾지 못했어요: ${message}`
          : `Couldn't search places: ${message}`
      );
    } finally {
      setIsSearching(false);
    }
  }

  async function handleConfirmCandidate(picked: PlaceCandidate) {
    setPendingCandidates([]);
    setPendingQuery("");
    setIsSearching(true);
    try {
      const location = await getCurrentDeviceLocation();
      if (location.kind !== "ok") {
        setErrorMessage(
          language === "ko"
            ? "위치 권한이 없거나 현재 위치를 받지 못해 경로를 찾을 수 없어요."
            : "Couldn't get your location. Allow location permission and try again."
        );
        return;
      }
      // picked 좌표를 destination string으로 직접 전달 ("lat,lng" 형식 Google 인식).
      await runDirections(location.lat, location.lng, `${picked.lat},${picked.lng}`);
      // 사용자가 입력한 질의 대신 picked.name으로 결과 카드 라벨이 더 명확해지도록 갱신.
      setDestination(picked.name);
    } finally {
      setIsSearching(false);
    }
  }

  function handleCancelConfirm() {
    setPendingCandidates([]);
    setPendingQuery("");
  }

  return (
    <View style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>{language === "ko" ? "어디로 가세요?" : "Where to?"}</Text>
        <Text style={styles.subtitle}>
          {language === "ko"
            ? "현재 위치에서 출발한다고 가정하고 경로를 보여드려요."
            : "We assume your current location as the start point."}
        </Text>

        <View style={{ gap: 8 }}>
          <Text style={styles.sectionLabel}>
            {language === "ko" ? "목적지" : "Destination"}
          </Text>
          <TextInput
            style={styles.input}
            placeholder={language === "ko" ? "예) 광운대학교, 서울역" : "e.g. Gangnam Station"}
            placeholderTextColor={theme.colors.textMuted}
            value={destination}
            onChangeText={setDestination}
            autoCorrect={false}
            returnKeyType="search"
            onSubmitEditing={() => void handleSearch()}
          />
        </View>

        <Pressable
          style={[styles.primaryButton, (!destination.trim() || isSearching) && { opacity: 0.5 }]}
          disabled={!destination.trim() || isSearching}
          onPress={() => void handleSearch()}
          accessibilityRole="button"
        >
          {isSearching ? (
            <ActivityIndicator color={theme.colors.accentText} />
          ) : (
            <Text style={styles.primaryButtonText}>
              {language === "ko" ? "경로 검색" : "Search routes"}
            </Text>
          )}
        </Pressable>

        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

        {options.map((option, index) => (
          <Pressable
            key={`opt-${index}`}
            style={styles.optionCard}
            onPress={() => onSelectOption(option, destination.trim())}
          >
            <OptionHeader option={option} styles={styles} language={language} />
            <OptionTimeline option={option} styles={styles} />
          </Pressable>
        ))}

        {hasSearched && !isSearching && options.length === 0 && !errorMessage ? (
          <Text style={styles.helperText}>
            {language === "ko"
              ? "경로가 없어요. 다른 목적지를 검색해 주세요."
              : "No routes found. Try a different destination."}
          </Text>
        ) : null}

        {onCancel ? (
          <Pressable
            onPress={onCancel}
            style={{ alignSelf: "center", paddingVertical: 12 }}
            accessibilityRole="button"
          >
            <Text style={{ color: theme.colors.textMuted, fontSize: 14, fontWeight: "700" }}>
              {language === "ko" ? "닫기" : "Close"}
            </Text>
          </Pressable>
        ) : null}
      </ScrollView>

      <DestinationConfirmModal
        visible={pendingCandidates.length > 0}
        query={pendingQuery}
        candidates={pendingCandidates}
        language={language}
        onConfirm={picked => void handleConfirmCandidate(picked)}
        onCancel={handleCancelConfirm}
      />
    </View>
  );
}

function OptionHeader({
  option,
  styles,
  language
}: {
  option: DirectionsOption;
  styles: ReturnType<typeof buildSearchTripStyles>;
  language: "ko" | "en";
}) {
  const totalMin = Math.max(1, Math.round(option.totalDurationSec / 60));
  const walkingSec = option.legs.reduce(
    (sum, l) => (l.mode === "walking" ? sum + l.durationSec : sum),
    0
  );
  const walkingMin = Math.round(walkingSec / 60);
  const km =
    option.totalDistanceMeters < 1000
      ? `${option.totalDistanceMeters}m`
      : `${(option.totalDistanceMeters / 1000).toFixed(1)}km`;

  const metaParts =
    language === "ko"
      ? [
          walkingMin > 0 ? `도보 ${walkingMin}분` : null,
          `환승 ${option.transferCount}회`,
          km
        ]
      : [
          walkingMin > 0 ? `${walkingMin} min walk` : null,
          `${option.transferCount} transfer`,
          km
        ];

  return (
    <View style={styles.optionHeaderRow}>
      <Text style={styles.optionDuration}>
        {totalMin}
        {language === "ko" ? "분" : " min"}
      </Text>
      <Text style={styles.optionMeta}>{metaParts.filter(Boolean).join(" · ")}</Text>
    </View>
  );
}

function formatHeadsign(headsign: string | null) {
  const trimmed = headsign?.trim() ?? "";
  if (!trimmed) return "";
  return trimmed.endsWith("방면") ? trimmed : `${trimmed} 방면`;
}

function lineBadgeFontSize(label: string) {
  if (label.length <= 2) return 12;
  if (label.length === 3) return 10;
  if (label.length === 4) return 9;
  return 7;
}

function OptionTimeline({
  option,
  styles
}: {
  option: DirectionsOption;
  styles: ReturnType<typeof buildSearchTripStyles>;
}) {
  const transitLegs = option.legs.filter((l): l is TransitLeg => l.mode === "transit");
  // transit이 하나도 없는 경우 (도보만) — 거리 정도만 표시.
  if (transitLegs.length === 0) {
    const walking = option.legs.filter((l): l is WalkingLeg => l.mode === "walking");
    const min = Math.max(1, Math.round(walking.reduce((s, l) => s + l.durationSec, 0) / 60));
    return (
      <View style={styles.timelineRow}>
        <View style={styles.timelineRail}>
          <View style={styles.walkingDot} />
        </View>
        <View style={styles.timelineBody}>
          <Text style={styles.walkingLabel}>{`도보 ${min}분`}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.timeline}>
      {transitLegs.map((leg, idx) => {
        const label = lineBadgeLabel(leg);
        return (
          <View key={`t-${idx}`} style={styles.timelineRow}>
            <View style={styles.timelineRail}>
              <View
                style={[styles.lineBadge, { backgroundColor: lineColor(leg) }]}
              >
                <Text
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  style={[
                    styles.lineBadgeText,
                    { fontSize: lineBadgeFontSize(label) }
                  ]}
                >
                  {label}
                </Text>
              </View>
              <View style={styles.timelineConnector} />
            </View>
            <View style={styles.timelineBody}>
              <Text style={styles.stopName}>
                {leg.departureStop.name}
                <Text style={styles.stopLineSuffix}>{` (${lineFullLabel(leg)})`}</Text>
              </Text>
              {leg.headsign ? (
                <Text style={styles.stopHeadsign}>{formatHeadsign(leg.headsign)}</Text>
              ) : null}
              <Text style={styles.stopHeadsign}>
                {`${leg.numStops}정거장 · ${Math.max(1, Math.round(leg.durationSec / 60))}분`}
              </Text>
            </View>
          </View>
        );
      })}
      {/* 마지막 도착 stop */}
      <View style={styles.timelineRow}>
        <View style={styles.timelineRail}>
          <View style={styles.lineBadgeEnd} />
        </View>
        <View style={[styles.timelineBody, styles.timelineBodyLast]}>
          <Text style={styles.stopName}>
            {transitLegs[transitLegs.length - 1].arrivalStop.name}
          </Text>
        </View>
      </View>
    </View>
  );
}

const SUBWAY_LINE_COLORS: Record<string, string> = {
  "1": "#0052A4",
  "2": "#00A84D",
  "3": "#EF7C1C",
  "4": "#00A4E3",
  "5": "#996CAC",
  "6": "#CD7C2F",
  "7": "#747F00",
  "8": "#E6186C",
  "9": "#BB8336"
};

const NAMED_LINE_COLORS: Array<[RegExp, string]> = [
  [/신분당/, "#D31145"],
  [/분당/, "#FFCD12"],
  [/경의중앙|중앙선/, "#77C4A3"],
  [/공항|airport/i, "#0090D2"],
  [/수인|수인분당/, "#FABE00"],
  [/경춘/, "#0C8E72"],
  [/경강|gyeonggang/i, "#0054A6"],
  [/우이신설|우이/, "#B0CE18"],
  [/김포골드|김포/, "#A17800"],
  [/신림/, "#6789CA"],
  [/itx/i, "#002664"],
  [/ktx/i, "#293896"]
];

function lineColor(leg: TransitLeg): string {
  const short = (leg.lineShort ?? "").trim();
  const name = (leg.lineName ?? "").trim();
  const numericMatch = short.match(/(\d+)/) ?? name.match(/(\d+)\s*호선/);
  if (numericMatch && SUBWAY_LINE_COLORS[numericMatch[1]]) {
    return SUBWAY_LINE_COLORS[numericMatch[1]];
  }
  for (const [pattern, color] of NAMED_LINE_COLORS) {
    if (pattern.test(short) || pattern.test(name)) return color;
  }
  // 버스 — 기본 파란색(간선버스 톤). 색상 세분화는 추후.
  if (leg.transitKind === "BUS") return "#3B6FE0";
  return "#4A4E66";
}

function lineBadgeLabel(leg: TransitLeg): string {
  const short = (leg.lineShort ?? "").trim();
  if (short) {
    // 버스 번호 등 4자리 이상도 그대로 — 표시는 동적 fontSize로 축소.
    const numeric = short.match(/(\d+)/);
    if (numeric) return numeric[1];
    return short.slice(0, 4);
  }
  const name = (leg.lineName ?? "").trim();
  const numeric2 = name.match(/(\d+)\s*호선/);
  if (numeric2) return numeric2[1];
  if (/신분당/.test(name)) return "신분";
  if (/분당/.test(name)) return "분당";
  if (/공항/.test(name)) return "공항";
  if (/경의중앙/.test(name)) return "중앙";
  if (leg.transitKind === "BUS") return name.slice(0, 4) || "버스";
  return name.slice(0, 4) || "—";
}

function lineFullLabel(leg: TransitLeg): string {
  if (leg.lineShort && leg.lineName && leg.lineShort !== leg.lineName) {
    return `${leg.lineName} ${leg.lineShort}`;
  }
  return leg.lineShort ?? leg.lineName ?? leg.transitKind;
}
