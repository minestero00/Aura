import React from "react";
import { Pressable, Text, View } from "react-native";
import type { AppCopy } from "@features/app/i18n";
import { createAppStyles } from "@features/app/styles";
import type { CalendarAgendaDay, CalendarAgendaEvent, CalendarTravelHint } from "@features/calendar/types";
import { formatEventTime, formatTravelHint, openRouteInGoogleMaps, travelModeIcon } from "./helpers";

interface AgendaDayCardProps {
  copy: AppCopy;
  day: CalendarAgendaDay;
  styles: ReturnType<typeof createAppStyles>;
  travelHintsByEventId: Map<string, CalendarTravelHint>;
}

type EventStatus = "past" | "now" | "future";

// today 카드의 일정에 대해서만 시각 status를 계산. tomorrow는 모두 future.
function getEventStatus(event: CalendarAgendaEvent, now: Date): EventStatus {
  if (event.isAllDay) return "future";
  const start = Date.parse(event.startsAt);
  if (Number.isNaN(start)) return "future";
  // endsAt이 없는 일정은 1시간짜리로 추정 (Google Calendar default는 보통 1시간).
  const end = event.endsAt ? Date.parse(event.endsAt) : start + 60 * 60 * 1000;
  if (Number.isNaN(end)) return "future";
  const t = now.getTime();
  if (end <= t) return "past";
  if (start <= t && t < end) return "now";
  return "future";
}

export function AgendaDayCard({ copy, day, styles, travelHintsByEventId }: AgendaDayCardProps) {
  // 매 분 단위로 갱신해도 충분 — 오늘 일정의 status가 1분 안에 바뀌는 경우 거의 없음.
  // 단순히 render 시점의 now로 결정. 사용자가 화면 다시 진입할 때마다 recompute.
  const now = new Date();
  const isTodayCard = day.key === "today";

  return (
    <View style={styles.messageCard}>
      <Text style={styles.sectionTitle}>{day.key === "today" ? copy.todo.today : copy.todo.tomorrow}</Text>

      {day.events.length === 0 ? <Text style={styles.helperText}>{copy.todo.noEvents}</Text> : null}

      {day.events.map(event => {
        const status = isTodayCard ? getEventStatus(event, now) : "future";
        const isPast = status === "past";
        const isNow = status === "now";

        return (
          <View
            key={event.id}
            style={[
              styles.messageCard,
              isPast ? styles.eventCardPast : null,
              isNow ? styles.eventCardNow : null
            ]}
          >
            {isNow ? (
              <View style={styles.eventNowRow}>
                <View style={styles.eventNowDot} />
                <Text style={styles.eventNowLabel}>{copy.todo.eventNow}</Text>
              </View>
            ) : null}
            <Text style={[styles.messageSubject, isPast ? styles.eventTextDimmed : null]}>{event.title}</Text>
            <Text style={[styles.eventTime, isPast ? styles.eventTextDimmed : null]}>
              {formatEventTime(copy, event.startsAt, event.endsAt, event.isAllDay)}
            </Text>
            {event.location ? (
              <Text style={[styles.messageMeta, isPast ? styles.eventTextDimmed : null]}>{event.location}</Text>
            ) : null}
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
        );
      })}
    </View>
  );
}
