import notifee, { AndroidImportance, TriggerType } from "@notifee/react-native";
import { Platform } from "react-native";
import type { DirectionsLeg } from "./types";

const CHANNEL_ARRIVAL = "aura.transit.arrival";
const CHANNEL_DEPARTURE = "aura.transit.departure";
const ARRIVAL_PREFIX = "aura-transit-arrival";
const DEPARTURE_PREFIX = "aura-transit-depart";
const DEPARTURE_ALERT_MINUTES = [5, 2] as const;

async function ensureChannels() {
  if (Platform.OS !== "android") return;
  await notifee.createChannel({
    id: CHANNEL_ARRIVAL,
    name: "도착 알림",
    importance: AndroidImportance.HIGH
  });
  await notifee.createChannel({
    id: CHANNEL_DEPARTURE,
    name: "출발 알림",
    importance: AndroidImportance.HIGH
  });
}

export async function presentTransitArrivalNotification(input: {
  tripId: string;
  legIndex: number;
  stopName: string;
  language: "ko" | "en";
  type?: "transit-arrival" | "destination";
}) {
  const settings = await notifee.getNotificationSettings();
  if (settings.authorizationStatus < 1) return;

  await ensureChannels();
  const type = input.type ?? "transit-arrival";
  const id = `${ARRIVAL_PREFIX}-${input.tripId}-${input.legIndex}`;
  const copy =
    input.language === "ko"
      ? type === "destination"
        ? { title: "AURA 도착 알림", body: `${input.stopName}에 거의 도착했어요. 조심히 도착하셨나요?` }
        : { title: "AURA 도착 알림", body: `${input.stopName} 근처에 도착했습니다.` }
      : type === "destination"
        ? { title: "AURA arrival", body: `Approaching ${input.stopName}. Did you arrive safely?` }
        : { title: "AURA arrival", body: `Approaching ${input.stopName}.` };

  await notifee.displayNotification({
    id,
    title: copy.title,
    body: copy.body,
    android: {
      channelId: CHANNEL_ARRIVAL,
      importance: AndroidImportance.HIGH,
      pressAction: { id: "default" }
    },
    ios: { sound: "default" },
    data: { type, tripId: input.tripId, legIndex: String(input.legIndex) }
  });
}

export async function cancelTransitArrivalNotifications(
  tripId: string,
  legCount: number
): Promise<void> {
  const ids = Array.from({ length: legCount }, (_, i) => `${ARRIVAL_PREFIX}-${tripId}-${i}`);
  await Promise.all(ids.map(id => notifee.cancelNotification(id)));
}

// ─── 출발 예약 알림 ───────────────────────────────────────────────────────────

export async function scheduleDepartureAlerts(input: {
  tripId: string;
  legs: DirectionsLeg[];
  language: "ko" | "en";
}): Promise<void> {
  await ensureChannels();
  const now = Date.now();

  for (const [legIndex, leg] of input.legs.entries()) {
    if (leg.mode !== "transit" || leg.departureTimeUnix == null) continue;
    const depMs = leg.departureTimeUnix * 1000;
    const lineLabel =
      leg.lineShort ?? leg.lineName ?? (input.language === "ko" ? "대중교통" : "transit");
    const headsignPart = leg.headsign
      ? input.language === "ko"
        ? `${leg.headsign} `
        : `→ ${leg.headsign} `
      : "";

    for (const minutesBefore of DEPARTURE_ALERT_MINUTES) {
      const fireTs = depMs - minutesBefore * 60_000;
      if (fireTs <= now) continue;

      const body =
        input.language === "ko"
          ? `${lineLabel} ${headsignPart}${minutesBefore}분 후 출발합니다`
          : `${lineLabel} ${headsignPart}departs in ${minutesBefore} min`;

      await notifee.createTriggerNotification(
        {
          id: `${DEPARTURE_PREFIX}-${input.tripId}-${legIndex}-${minutesBefore}m`,
          title: input.language === "ko" ? "AURA 탑승 알림" : "AURA boarding alert",
          body,
          android: {
            channelId: CHANNEL_DEPARTURE,
            importance: AndroidImportance.HIGH,
            pressAction: { id: "default" }
          },
          ios: { sound: "default" },
          data: {
            type: "transit-departure",
            tripId: input.tripId,
            legIndex: String(legIndex)
          }
        },
        {
          type: TriggerType.TIMESTAMP,
          timestamp: fireTs,
          alarmManager: { allowWhileIdle: true }
        }
      );
    }
  }
}

export async function cancelDepartureAlerts(tripId: string, legCount: number): Promise<void> {
  const ids: string[] = [];
  for (let i = 0; i < legCount; i++) {
    for (const m of DEPARTURE_ALERT_MINUTES) {
      ids.push(`${DEPARTURE_PREFIX}-${tripId}-${i}-${m}m`);
    }
  }
  await Promise.all(ids.map(id => notifee.cancelTriggerNotification(id)));
}

export async function cancelLegDepartureAlerts(
  tripId: string,
  legIndex: number
): Promise<void> {
  await Promise.all(
    DEPARTURE_ALERT_MINUTES.map(m =>
      notifee.cancelTriggerNotification(`${DEPARTURE_PREFIX}-${tripId}-${legIndex}-${m}m`)
    )
  );
}

export async function ensureTransitNotificationPermission(): Promise<boolean> {
  const result = await notifee.requestPermission();
  return result.authorizationStatus >= 1;
}

export type TransitNotificationStatus = "granted" | "denied" | "notDetermined";

export async function getTransitNotificationStatus(): Promise<TransitNotificationStatus> {
  const settings = await notifee.getNotificationSettings();
  const status = settings.authorizationStatus;
  if (status >= 1) return "granted";
  if (status === -1) return "notDetermined";
  return "denied";
}
