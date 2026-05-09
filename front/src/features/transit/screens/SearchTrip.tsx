import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuraTheme } from "@features/app/styles";
import { fetchDirections } from "@features/transit/api";
import { getCurrentDeviceLocation } from "@features/location/current-location";
import type { DirectionsLeg, DirectionsOption } from "@features/transit/types";
import { buildSearchTripStyles } from "./SearchTrip.styles";

interface SearchTripScreenProps {
  language: "ko" | "en";
  /** 옵션 선택 콜백 — caller가 createActiveTripFromOption + saveActiveTrip. */
  onSelectOption: (option: DirectionsOption, destinationLabel: string) => void;
  onCancel: () => void;
}

/**
 * Client-driven transit의 진입 화면. 사용자가 목적지를 입력하면 backend
 * Directions로 경로 옵션 N개를 받아 카드로 표시. 옵션 선택은 caller에 위임
 * (Step 3에서 AsyncStorage 저장 + Region Monitoring 등록).
 */
export function SearchTripScreen({ language, onSelectOption, onCancel }: SearchTripScreenProps) {
  const theme = useAuraTheme();
  const styles = useMemo(() => buildSearchTripStyles(theme), [theme]);

  const [destination, setDestination] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [options, setOptions] = useState<DirectionsOption[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

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
      const result = await fetchDirections({
        originLat: location.lat,
        originLng: location.lng,
        destination: trimmed,
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
    } finally {
      setIsSearching(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
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
            <View style={styles.optionHeader}>
              <Text style={styles.optionDuration}>
                {Math.max(1, Math.round(option.totalDurationSec / 60))}
                {language === "ko" ? "분" : " min"}
              </Text>
              <Text style={styles.optionMeta}>
                {language === "ko"
                  ? `환승 ${option.transferCount}회 · 약 ${formatKm(option.totalDistanceMeters)}`
                  : `${option.transferCount} transfer · ${formatKm(option.totalDistanceMeters)}`}
              </Text>
            </View>
            <View style={styles.legChipRow}>
              {option.legs.map((leg, i) => (
                <React.Fragment key={`leg-${i}`}>
                  {i > 0 ? <Text style={styles.legArrow}>›</Text> : null}
                  <LegChip leg={leg} styles={styles} theme={theme} />
                </React.Fragment>
              ))}
            </View>
          </Pressable>
        ))}

        {hasSearched && !isSearching && options.length === 0 && !errorMessage ? (
          <Text style={styles.helperText}>
            {language === "ko"
              ? "경로가 없어요. 다른 목적지를 검색해 주세요."
              : "No routes found. Try a different destination."}
          </Text>
        ) : null}

        <Pressable
          onPress={onCancel}
          style={{ alignSelf: "center", paddingVertical: 12 }}
          accessibilityRole="button"
        >
          <Text style={{ color: theme.colors.textMuted, fontSize: 14, fontWeight: "700" }}>
            {language === "ko" ? "닫기" : "Close"}
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function LegChip({
  leg,
  styles,
  theme
}: {
  leg: DirectionsLeg;
  styles: ReturnType<typeof buildSearchTripStyles>;
  theme: ReturnType<typeof useAuraTheme>;
}) {
  if (leg.mode === "walking") {
    return (
      <View
        style={[
          styles.legChip,
          { backgroundColor: theme.colors.surfaceMuted, borderColor: theme.colors.line }
        ]}
      >
        <Text style={[styles.legChipText, { color: theme.colors.textSecondary }]}>🚶</Text>
      </View>
    );
  }
  // transit
  const isSubway = /SUBWAY|RAIL|TRAM|METRO/i.test(leg.transitKind);
  const bg = isSubway ? "#E0F2FE" : "#FEF3C7";
  const fg = isSubway ? "#0369A1" : "#92400E";
  const icon = isSubway ? "🚇" : "🚌";
  const label = leg.lineShort ?? leg.lineName ?? leg.transitKind;
  return (
    <View style={[styles.legChip, { backgroundColor: bg, borderColor: bg }]}>
      <Text style={[styles.legChipText, { color: fg }]}>
        {icon} {label}
      </Text>
    </View>
  );
}

function formatKm(meters: number) {
  if (meters < 1000) return `${meters}m`;
  return `${(meters / 1000).toFixed(1)}km`;
}
