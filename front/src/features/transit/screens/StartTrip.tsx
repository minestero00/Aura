import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuraTheme } from "@features/app/styles";
import { startTrip as startTripApi, getActiveTrip } from "@features/transit/api";
import type { TransitMode, TransitTrip } from "@features/transit/types";
import type { CalendarAgendaEvent } from "@features/calendar/types";
import { buildStartTripStyles } from "./StartTrip.styles";

interface StartTripProps {
  nextEvent?: CalendarAgendaEvent | null;
  destinationLocation?: { lat: number; lng: number; label?: string } | null;
  onTripStarted: (trip: TransitTrip) => void;
  onCancel: () => void;
}

const DEFAULT_THRESHOLD_STOPS = 1;

export function StartTripScreen({
  nextEvent,
  destinationLocation,
  onTripStarted,
  onCancel
}: StartTripProps) {
  const theme = useAuraTheme();
  const styles = useMemo(() => buildStartTripStyles(theme), [theme]);

  const [mode, setMode] = useState<TransitMode>("bus");
  const [routeName, setRouteName] = useState("");
  const [destinationName, setDestinationName] = useState(
    destinationLocation?.label ?? nextEvent?.location ?? ""
  );
  const [originStopName, setOriginStopName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [activeTripId, setActiveTripId] = useState<string | null>(null);
  const [checkedActive, setCheckedActive] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const result = await getActiveTrip();
        if (!cancelled) {
          setActiveTripId(result.trip?.id ?? null);
        }
      } catch {
        // network failure: allow start anyway
      } finally {
        if (!cancelled) setCheckedActive(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const canSubmit =
    routeName.trim().length > 0 &&
    destinationName.trim().length > 0 &&
    Boolean(destinationLocation) &&
    !submitting &&
    !activeTripId;

  async function handleStart() {
    if (!canSubmit || !destinationLocation) {
      return;
    }
    setSubmitting(true);
    try {
      const { trip } = await startTripApi({
        mode,
        routeName: routeName.trim(),
        originStopName: originStopName.trim() || undefined,
        destinationStopName: destinationName.trim(),
        destinationLat: destinationLocation.lat,
        destinationLng: destinationLocation.lng,
        alertThresholdStops: DEFAULT_THRESHOLD_STOPS
      });
      onTripStarted(trip);
    } catch (error) {
      const message = error instanceof Error ? error.message : "탑승을 시작할 수 없습니다.";
      Alert.alert("오류", message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View>
          <Text style={styles.title}>탑승 시작</Text>
          <Text style={styles.subtitle}>
            도착 1정거장 전에 알림을 보내드립니다. 음악·유튜브 중에도 진동+소리로 깨워드립니다.
          </Text>
        </View>

        {nextEvent ? (
          <View style={styles.contextCard}>
            <Text style={styles.contextLabel}>다음 일정</Text>
            <Text style={styles.contextTitle}>{nextEvent.title}</Text>
            {nextEvent.location ? (
              <Text style={styles.contextMeta}>{nextEvent.location}</Text>
            ) : (
              <Text style={styles.contextMeta}>위치가 없는 일정입니다. 도착지를 직접 입력하세요.</Text>
            )}
          </View>
        ) : null}

        <View style={{ gap: 8 }}>
          <Text style={styles.sectionLabel}>이동수단</Text>
          <View style={styles.chipRow}>
            {(["bus", "subway"] as TransitMode[]).map(option => {
              const active = option === mode;
              return (
                <Pressable
                  key={option}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => setMode(option)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>
                    {option === "bus" ? "버스" : "지하철"}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={{ gap: 8 }}>
          <Text style={styles.sectionLabel}>{mode === "bus" ? "버스 번호" : "노선/방향"}</Text>
          <TextInput
            style={styles.input}
            placeholder={mode === "bus" ? "예) 472, 1002" : "예) 2호선 잠실 방면"}
            placeholderTextColor={theme.colors.textMuted}
            value={routeName}
            onChangeText={setRouteName}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        <View style={{ gap: 8 }}>
          <Text style={styles.sectionLabel}>출발 정류장 (선택)</Text>
          <TextInput
            style={styles.input}
            placeholder="예) 강남역, 시청"
            placeholderTextColor={theme.colors.textMuted}
            value={originStopName}
            onChangeText={setOriginStopName}
          />
        </View>

        <View style={{ gap: 8 }}>
          <Text style={styles.sectionLabel}>도착 정류장</Text>
          <TextInput
            style={styles.input}
            placeholder="예) 서울시청, 강남역"
            placeholderTextColor={theme.colors.textMuted}
            value={destinationName}
            onChangeText={setDestinationName}
          />
          {!destinationLocation ? (
            <Text style={styles.helperText}>
              도착지의 GPS 좌표가 없습니다. 캘린더 일정에서 위치가 인식되지 않으면 직접 위치를 검색해
              선택해야 합니다.
            </Text>
          ) : null}
        </View>

        {activeTripId ? (
          <Text style={styles.helperText}>
            이미 진행 중인 탑승이 있습니다. 먼저 종료한 뒤 새 탑승을 시작하세요.
          </Text>
        ) : null}

        <Pressable
          style={[styles.primaryButton, styles.primaryButtonAccent, !canSubmit && { opacity: 0.5 }]}
          disabled={!canSubmit}
          onPress={handleStart}
          accessibilityRole="button"
        >
          {submitting ? (
            <ActivityIndicator color={theme.colors.accentText} />
          ) : (
            <Text style={styles.primaryButtonText}>탑승 시작</Text>
          )}
        </Pressable>

        <Pressable style={styles.secondaryButton} onPress={onCancel} accessibilityRole="button">
          <Text style={styles.secondaryButtonText}>취소</Text>
        </Pressable>

        {!checkedActive ? (
          <Text style={styles.helperText}>진행 중인 탑승 확인 중...</Text>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
