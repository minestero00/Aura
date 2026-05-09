import React from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { AppCopy } from "@features/app/i18n";
import { createAppStyles, useAuraTheme } from "@features/app/styles";
import { mergeAgendaDays } from "@features/calendar/merge";
import type { CalendarAgendaDay, CalendarTravelHint } from "@features/calendar/types";
import { AgendaDayCard } from "@features/app/screens/todo/agenda-day-card";
import { TravelModeSelector } from "@features/app/screens/todo/travel-mode-selector";
import type { TodayWeatherAdvice } from "@features/weather/types";

interface TodoScreenProps {
  calendarAgendaDays: CalendarAgendaDay[];
  calendarTravelHints: CalendarTravelHint[];
  calendarConnected: boolean;
  copy: AppCopy;
  deviceCalendarAgendaDays: CalendarAgendaDay[];
  isDeviceCalendarLoading: boolean;
  isDeviceCalendarPermissionGranted: boolean;
  isWeatherLoading: boolean;
  isCalendarLoading: boolean;
  isCalendarTravelLoading: boolean;
  selectedTravelMode: "driving" | "transit";
  todayWeatherAdvice: TodayWeatherAdvice | null;
  onConnectDeviceCalendar: () => Promise<void>;
  onConnectCalendar: () => Promise<void>;
  onSetTravelMode: (mode: "driving" | "transit") => void;
  onLoadTodayWeatherAdvice: () => Promise<void>;
  onLoadDeviceCalendarAgenda: () => Promise<void>;
  onLoadCalendarAgenda: () => Promise<void>;
}

export function TodoScreen({
  calendarAgendaDays,
  calendarTravelHints,
  calendarConnected,
  copy,
  deviceCalendarAgendaDays,
  isDeviceCalendarLoading,
  isDeviceCalendarPermissionGranted,
  isWeatherLoading,
  isCalendarLoading,
  isCalendarTravelLoading,
  selectedTravelMode,
  todayWeatherAdvice,
  onConnectDeviceCalendar,
  onConnectCalendar,
  onSetTravelMode,
  onLoadTodayWeatherAdvice,
  onLoadDeviceCalendarAgenda,
  onLoadCalendarAgenda
}: TodoScreenProps) {
  const theme = useAuraTheme();
  const styles = createAppStyles(theme);
  const mergedAgendaDays = mergeAgendaDays(calendarAgendaDays, deviceCalendarAgendaDays);
  const isAnyLoading = isCalendarLoading || isDeviceCalendarLoading;
  const travelHintsByEventId = new Map(calendarTravelHints.map(hint => [hint.eventId, hint]));

  async function handleLoadMergedAgenda() {
    const jobs: Array<Promise<void>> = [];

    if (calendarConnected) {
      jobs.push(onLoadCalendarAgenda());
    }

    if (isDeviceCalendarPermissionGranted) {
      jobs.push(onLoadDeviceCalendarAgenda());
    }

    await Promise.all(jobs);
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent} style={styles.scrollView}>
        <View style={styles.heroBare}>
          <Text style={styles.eyebrow}>{copy.todo.eyebrow}</Text>
          <Text style={styles.title}>{copy.todo.title}</Text>
          <Text style={styles.subtitle}>{copy.todo.subtitle}</Text>
        </View>

        {!isDeviceCalendarPermissionGranted ? (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>{copy.todo.deviceConnectTitle}</Text>
            <Text style={styles.helperText}>{copy.todo.deviceConnectBody}</Text>
            <View style={styles.buttonRow}>
              <Pressable onPress={() => void onConnectDeviceCalendar()} style={styles.secondaryButton}>
                <Text style={styles.secondaryButtonText}>{copy.todo.deviceConnectAction}</Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>{copy.todo.weatherTitle}</Text>
          <Text style={styles.sectionSubtitle}>{copy.todo.weatherSubtitle}</Text>

          <View style={styles.buttonRow}>
            <Pressable disabled={isWeatherLoading} onPress={() => void onLoadTodayWeatherAdvice()} style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>{copy.todo.weatherRefresh}</Text>
            </Pressable>
          </View>

          {isWeatherLoading ? (
            <View style={styles.inlineLoading}>
              <ActivityIndicator color={theme.colors.textPrimary} />
              <Text style={styles.inlineLoadingText}>{copy.todo.weatherLoading}</Text>
            </View>
          ) : null}

          {!isWeatherLoading && todayWeatherAdvice ? (
            <View style={styles.compactDigestCard}>
              <Text style={styles.compactDigestHeadline}>
                {todayWeatherAdvice.locationName} · {Math.round(todayWeatherAdvice.temperature.currentC)}°C
              </Text>
              <Text style={styles.detailLine}>{todayWeatherAdvice.advice.summary}</Text>
              <Text style={styles.detailLine}>{todayWeatherAdvice.advice.umbrellaAdvice}</Text>
              <Text style={styles.detailLine}>{todayWeatherAdvice.advice.outfitAdvice}</Text>
            </View>
          ) : null}

          {!isWeatherLoading && !todayWeatherAdvice ? (
            <Text style={styles.helperText}>{copy.todo.weatherUnavailable}</Text>
          ) : null}
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>{copy.todo.title}</Text>
          <Text style={styles.sectionSubtitle}>{copy.todo.subtitle}</Text>

          <Text style={styles.inputLabel}>{copy.todo.travelBasisTitle}</Text>
          <TravelModeSelector
            copy={copy}
            selectedTravelMode={selectedTravelMode}
            styles={styles}
            onSetTravelMode={onSetTravelMode}
          />

          <View style={styles.buttonRow}>
            <Pressable
              disabled={isAnyLoading || (!calendarConnected && !isDeviceCalendarPermissionGranted)}
              onPress={() => void handleLoadMergedAgenda()}
              style={styles.secondaryButton}
            >
              <Text style={styles.secondaryButtonText}>{copy.todo.loadAgenda}</Text>
            </Pressable>
          </View>

          {isAnyLoading ? (
            <View style={styles.inlineLoading}>
              <ActivityIndicator color={theme.colors.textPrimary} />
              <Text style={styles.inlineLoadingText}>{copy.todo.loading}</Text>
            </View>
          ) : null}
          {isCalendarTravelLoading ? (
            <Text style={styles.helperText}>{copy.todo.travelLoading}</Text>
          ) : null}

          {mergedAgendaDays.map(day => (
            <AgendaDayCard
              key={day.key}
              copy={copy}
              day={day}
              styles={styles}
              travelHintsByEventId={travelHintsByEventId}
            />
          ))}
        </View>

        {/* Google 다시 연결 카드는 메인 일정 화면에서 제거 — 사용자 요청.
            토큰 stale 시 backend가 refresh_token으로 자동 갱신(이미 동작),
            정말 reconnect가 필요한 케이스는 설정 화면에서만 노출. */}
      </ScrollView>
    </SafeAreaView>
  );
}
