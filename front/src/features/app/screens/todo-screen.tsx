import React from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { AppCopy } from "@features/app/i18n";
import { createAppStyles, useAuraTheme } from "@features/app/styles";
import { mergeAgendaDays } from "@features/calendar/merge";
import type { CalendarAgendaDay, CalendarAgendaEvent, CalendarTravelHint } from "@features/calendar/types";

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

function formatEventTime(copy: AppCopy, startsAt: string, endsAt: string | null, isAllDay: boolean) {
  if (isAllDay) {
    return copy.todo.allDay;
  }

  const start = new Date(startsAt);
  const end = endsAt ? new Date(endsAt) : null;
  const startLabel = start.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

  if (!end) {
    return startLabel;
  }

  const endLabel = end.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  return `${startLabel} - ${endLabel}`;
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

  function renderAgendaDay(day: CalendarAgendaDay) {
    return (
      <View key={day.key} style={styles.messageCard}>
        <Text style={styles.sectionTitle}>{day.key === "today" ? copy.todo.today : copy.todo.tomorrow}</Text>

        {day.events.length === 0 ? (
          <Text style={styles.helperText}>{copy.todo.noEvents}</Text>
        ) : null}

        {day.events.map((event: CalendarAgendaEvent) => (
          <View key={event.id} style={styles.messageCard}>
            <Text style={styles.messageSubject}>{event.title}</Text>
            <Text style={styles.eventTime}>
              {formatEventTime(copy, event.startsAt, event.endsAt, event.isAllDay)}
            </Text>
            {event.location ? <Text style={styles.messageMeta}>{event.location}</Text> : null}
            {event.source ? (
              <View style={styles.sourceBadge}>
                <Text style={styles.sourceBadgeText}>
                  {event.source === "device" ? copy.todo.deviceTitle : "Google"}
                </Text>
              </View>
            ) : null}
            {travelHintsByEventId.has(event.id) ? (
              <View style={styles.travelHintRow}>
                <Text style={styles.travelHintIcon}>
                  {travelModeIcon(travelHintsByEventId.get(event.id)!.travelMode)}
                </Text>
                <Text style={styles.helperText}>
                  {formatTravelHint(copy, travelHintsByEventId.get(event.id)!)}
                </Text>
              </View>
            ) : null}
          </View>
        ))}
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent} style={styles.scrollView}>
        <View style={styles.heroCard}>
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
          <Text style={styles.sectionTitle}>{copy.todo.title}</Text>
          <Text style={styles.sectionSubtitle}>{copy.todo.subtitle}</Text>

          <Text style={styles.inputLabel}>{copy.todo.travelBasisTitle}</Text>
          <View style={styles.travelModeRow}>
            <Pressable
              onPress={() => onSetTravelMode("transit")}
              style={[
                styles.travelModeButton,
                selectedTravelMode === "transit" ? styles.travelModeButtonActive : null
              ]}
            >
              <Text
                style={[
                  styles.travelModeButtonText,
                  selectedTravelMode === "transit" ? styles.travelModeButtonTextActive : null
                ]}
              >
                🚌 {copy.todo.travelModeTransit}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => onSetTravelMode("driving")}
              style={[
                styles.travelModeButton,
                selectedTravelMode === "driving" ? styles.travelModeButtonActive : null
              ]}
            >
              <Text
                style={[
                  styles.travelModeButtonText,
                  selectedTravelMode === "driving" ? styles.travelModeButtonTextActive : null
                ]}
              >
                🚗 {copy.todo.travelModeDriving}
              </Text>
            </Pressable>
          </View>

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

          {mergedAgendaDays.map(renderAgendaDay)}
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

function formatTravelHint(copy: AppCopy, hint: CalendarTravelHint) {
  const departureTime = new Date(hint.recommendedDepartureAt).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit"
  });
  const method = copy.todo.travelMode(hint.travelMode);
  const body =
    hint.source === "current-location"
      ? `${copy.todo.travelFromCurrent(hint.durationMinutes, departureTime)} (${method})`
      : `${copy.todo.travelFromPrevious(hint.originLabel, hint.durationMinutes, departureTime)} (${method})`;

  if (hint.isTightTransfer) {
    return `${body} ${copy.todo.travelTightWarning}`;
  }

  return body;
}

function travelModeIcon(mode: "driving" | "transit" | "walking") {
  if (mode === "driving") {
    return "🚗";
  }
  if (mode === "transit") {
    return "🚌";
  }
  return "🚶";
}
