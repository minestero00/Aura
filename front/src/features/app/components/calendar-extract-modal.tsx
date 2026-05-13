import React from "react";
import { Pressable, Text, View } from "react-native";
import { AuraLoader } from "@features/app/components/aura-loader";
import { BottomSheetModal } from "@features/app/components/bottom-sheet-modal";
import { createAppStyles, useAuraTheme } from "@features/app/styles";
import { openInGoogleCalendar } from "@features/calendar/google-template";
import type { ExtractedCalendarEvent } from "@features/gmail/api";
import type { AppCopy } from "@features/app/i18n";

interface Props {
  visible: boolean;
  isLoading: boolean;
  event: ExtractedCalendarEvent | null;
  copy: AppCopy;
  onClose: () => void;
}

function formatLocalDateTime(iso: string | null, allDay: boolean): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    ...(allDay ? {} : { hour: "2-digit", minute: "2-digit" })
  }).format(date);
}

export function CalendarExtractModal({ visible, isLoading, event, copy, onClose }: Props) {
  const styles = createAppStyles(useAuraTheme());

  return (
    <BottomSheetModal visible={visible} onClose={onClose} sheetStyle={styles.modalCard}>
      <View style={styles.modalHandle} />
      <View style={styles.dailyBriefModalHeader}>
        <View style={styles.dailyBriefHeaderMain}>
          <Text style={styles.dailyBriefEyebrow}>AURA</Text>
          <Text style={styles.dailyBriefTitle}>{copy.mail.calendarExtractTitle}</Text>
        </View>
        <Pressable onPress={onClose} style={styles.dailyBriefCloseButton}>
          <Text style={styles.dailyBriefCloseText}>×</Text>
        </Pressable>
      </View>

      <View style={styles.dailyBriefBodyContent}>
        {isLoading ? (
          <AuraLoader size="md" message={copy.mail.calendarExtractLoading} />
        ) : !event || !event.hasEnoughInfo ? (
          <Text style={styles.dailyBriefEmptyText}>{copy.mail.calendarExtractInsufficient}</Text>
        ) : (
          <View>
            <Text style={styles.dailyBriefDigestHeadline}>{event.title || "—"}</Text>
            {event.startsAt ? (
              <Text style={styles.detailLine}>
                {formatLocalDateTime(event.startsAt, event.allDay)}
                {event.endsAt && event.endsAt !== event.startsAt
                  ? ` — ${formatLocalDateTime(event.endsAt, event.allDay)}`
                  : ""}
              </Text>
            ) : null}
            {event.location ? <Text style={styles.helperText}>📍 {event.location}</Text> : null}
            {event.details ? <Text style={styles.helperText}>{event.details}</Text> : null}

            <Pressable
              onPress={async () => {
                await openInGoogleCalendar(event);
                onClose();
              }}
              style={[styles.secondaryButton, { marginTop: 12 }]}
            >
              <Text style={styles.secondaryButtonText}>{copy.mail.calendarExtractAdd}</Text>
            </Pressable>
          </View>
        )}
      </View>
    </BottomSheetModal>
  );
}
