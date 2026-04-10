import React from "react";
import { Pressable, Text, View } from "react-native";
import type { AppCopy } from "@features/app/i18n";
import { createAppStyles } from "@features/app/styles";
import type { CalendarAgendaDay, CalendarTravelHint } from "@features/calendar/types";
import { formatEventTime, formatTravelHint, openRouteInGoogleMaps, travelModeIcon } from "./helpers";

interface AgendaDayCardProps {
  copy: AppCopy;
  day: CalendarAgendaDay;
  styles: ReturnType<typeof createAppStyles>;
  travelHintsByEventId: Map<string, CalendarTravelHint>;
}

export function AgendaDayCard({ copy, day, styles, travelHintsByEventId }: AgendaDayCardProps) {
  return (
    <View style={styles.messageCard}>
      <Text style={styles.sectionTitle}>{day.key === "today" ? copy.todo.today : copy.todo.tomorrow}</Text>

      {day.events.length === 0 ? <Text style={styles.helperText}>{copy.todo.noEvents}</Text> : null}

      {day.events.map(event => (
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
            <Pressable
              onPress={() => void openRouteInGoogleMaps(travelHintsByEventId.get(event.id)!)}
              style={styles.travelHintRow}
            >
              <Text style={styles.travelHintIcon}>
                {travelModeIcon(travelHintsByEventId.get(event.id)!.travelMode)}
              </Text>
              <View style={styles.travelHintMain}>
                <Text style={styles.travelHintText}>
                  {formatTravelHint(copy, travelHintsByEventId.get(event.id)!)}
                </Text>
                <Text style={styles.travelHintLinkText}>{copy.todo.travelOpenRoute}</Text>
              </View>
            </Pressable>
          ) : null}
        </View>
      ))}
    </View>
  );
}
