import React from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { HeroWaveDecoration } from "@components/hero-wave-decoration";
import type { AppCopy } from "@features/app/i18n";
import { createAppStyles, useAuraTheme } from "@features/app/styles";
import { mergeAgendaDays } from "@features/calendar/merge";
import type { CalendarAgendaDay, CalendarTravelHint } from "@features/calendar/types";
import { AgendaDayCard } from "@features/app/screens/todo/agenda-day-card";
import { TravelModeSelector } from "@features/app/screens/todo/travel-mode-selector";

interface TodoScreenProps {
  calendarAgendaDays: CalendarAgendaDay[];
  calendarTravelHints: CalendarTravelHint[];
  calendarConnected: boolean;
  copy: AppCopy;
  deviceCalendarAgendaDays: CalendarAgendaDay[];
  isDeviceCalendarLoading: boolean;
  isDeviceCalendarPermissionGranted: boolean;
  isCalendarLoading: boolean;
  isCalendarTravelLoading: boolean;
  selectedTravelMode: "driving" | "transit";
  onConnectDeviceCalendar: () => Promise<void>;
  onConnectCalendar: () => Promise<void>;
  onSetTravelMode: (mode: "driving" | "transit") => void;
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
  isCalendarLoading,
  isCalendarTravelLoading,
  selectedTravelMode,
  onConnectDeviceCalendar,
  onConnectCalendar,
  onSetTravelMode,
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
        <View style={styles.heroCard}>
          <HeroWaveDecoration />
          <View style={styles.heroForeground}>
            <Text style={styles.eyebrow}>{copy.todo.eyebrow}</Text>
            <Text style={styles.title}>{copy.todo.title}</Text>
            <Text style={styles.subtitle}>{copy.todo.subtitle}</Text>
          </View>
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

        {!calendarConnected ? (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>{copy.todo.reconnectTitle}</Text>
            <Text style={styles.helperText}>{copy.todo.reconnectBody}</Text>
            <View style={styles.buttonRow}>
              <Pressable onPress={() => void onConnectCalendar()} style={styles.secondaryButton}>
                <Text style={styles.secondaryButtonText}>{copy.todo.reconnectAction}</Text>
              </Pressable>
            </View>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
