import { authStore } from "../auth/store.js";
import { fetchEventsForMeetingBrief } from "../calendar/calendar-api.js";
import { fetchRecentGmailMessages } from "../integrations/gmail/gmail-api.js";
import { pushService } from "../push/service.js";
import { isBusinessAccessActive } from "../subscription/middleware.js";
import {
  cleanupOldAlerts,
  getAlertByEvent,
  markAlerted,
  upsertAlert
} from "./repository.js";

// 브리핑 대상 시간 창: 이벤트 시작 25~35분 전.
// 5분 cron 간격 안에서 한 번은 반드시 포함됨.
const BRIEF_WINDOW_BEFORE_MIN = 25;
const BRIEF_WINDOW_AFTER_MIN = 35;

function generateId() {
  return `mbf-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function resolveLanguage(timezone: string): "ko" | "en" {
  return timezone.startsWith("Asia/") ? "ko" : "en";
}

function buildPushCopy(
  language: "ko" | "en",
  eventTitle: string,
  attendeeCount: number,
  relatedMailCount: number
): { title: string; body: string } {
  if (language === "ko") {
    const title = `${eventTitle} 30분 후`;
    const parts: string[] = [];
    if (attendeeCount > 0) parts.push(`참석자 ${attendeeCount}명`);
    if (relatedMailCount > 0) parts.push(`관련 메일 ${relatedMailCount}건`);
    const body = parts.length > 0 ? parts.join(" · ") : "회의가 곧 시작됩니다";
    return { title, body };
  }
  const title = `${eventTitle} in 30 min`;
  const parts: string[] = [];
  if (attendeeCount > 0) parts.push(`${attendeeCount} attendees`);
  if (relatedMailCount > 0) parts.push(`${relatedMailCount} related emails`);
  const body = parts.length > 0 ? parts.join(" · ") : "Meeting starting soon";
  return { title, body };
}

export async function evaluateUserMeetingBrief(userId: string): Promise<{
  evaluated: number;
  fired: number;
  skipped: number;
}> {
  const user = authStore.findUserById(userId);
  const preferences = authStore.getPreferences(userId);

  if (!user || !preferences) return { evaluated: 0, fired: 0, skipped: 1 };
  if (!preferences.pushEnabled) return { evaluated: 0, fired: 0, skipped: 1 };
  if (!preferences.meetingBriefEnabled) return { evaluated: 0, fired: 0, skipped: 1 };

  // Business 구독 유효 여부 확인 (trial/active만 허용).
  const hasAccess = await isBusinessAccessActive(userId).catch(() => false);
  if (!hasAccess) return { evaluated: 0, fired: 0, skipped: 1 };

  const now = Date.now();
  const windowStart = now + BRIEF_WINDOW_BEFORE_MIN * 60_000;
  const windowEnd = now + BRIEF_WINDOW_AFTER_MIN * 60_000;

  let events: Awaited<ReturnType<typeof fetchEventsForMeetingBrief>>;
  try {
    events = await fetchEventsForMeetingBrief(userId, windowStart, windowEnd);
  } catch {
    // Google Calendar 미연결 또는 오류 — silent skip.
    return { evaluated: 0, fired: 0, skipped: 1 };
  }

  const nonAllDay = events.filter(e => !e.isAllDay);
  if (nonAllDay.length === 0) return { evaluated: 0, fired: 0, skipped: 0 };

  const language = resolveLanguage(user.timezone);
  let fired = 0;
  let skipped = 0;

  for (const event of nonAllDay) {
    const existing = await getAlertByEvent(userId, event.id);
    if (existing?.alertedAt) {
      skipped += 1;
      continue;
    }

    // 아직 미발송이면 레코드 생성(idempotent).
    if (!existing) {
      await upsertAlert({
        id: generateId(),
        userId,
        eventId: event.id,
        eventTitle: event.title,
        eventStartsAt: new Date(event.startsAt)
      });
    }

    // 관련 메일 검색 — Gmail 미연결이면 0건으로 처리.
    let relatedMailCount = 0;
    const connection = authStore.getGmailConnection(userId);
    if (connection && event.attendees.length > 0) {
      try {
        const fromParts = event.attendees
          .slice(0, 5)
          .map(a => `from:${a.email}`)
          .join(" OR ");
        const msgs = await fetchRecentGmailMessages(userId, {
          limit: 5,
          query: `in:inbox newer_than:3d (${fromParts})`
        });
        relatedMailCount = msgs.length;
      } catch {
        // Gmail 오류는 무시하고 계속.
      }
    }

    const copy = buildPushCopy(
      language,
      event.title,
      event.attendees.length,
      relatedMailCount
    );

    await pushService.sendToUser(userId, {
      title: copy.title,
      body: copy.body,
      category: "meeting_briefing",
      data: {
        type: "meeting-briefing",
        eventId: event.id,
        eventStartsAt: event.startsAt
      }
    });

    await markAlerted(userId, event.id);
    fired += 1;

    console.log(
      JSON.stringify({
        level: "info",
        service: "aura-worker",
        module: "meeting-brief",
        message: "brief sent",
        userId,
        eventId: event.id,
        eventTitle: event.title,
        attendeeCount: event.attendees.length,
        relatedMailCount
      })
    );
  }

  return { evaluated: nonAllDay.length, fired, skipped };
}

export async function evaluateAllUsersMeetingBriefs(): Promise<void> {
  await authStore.refreshActiveUsersFromDb().catch(error => {
    console.log(
      JSON.stringify({
        level: "warn",
        service: "aura-worker",
        module: "meeting-brief",
        message: "refreshActiveUsersFromDb failed",
        error: error instanceof Error ? error.message : String(error)
      })
    );
  });

  const users = authStore.listUsers();
  for (const user of users) {
    try {
      await evaluateUserMeetingBrief(user.id);
    } catch (error) {
      console.log(
        JSON.stringify({
          level: "warn",
          service: "aura-worker",
          module: "meeting-brief",
          message: "evaluateUserMeetingBrief threw",
          userId: user.id,
          error: error instanceof Error ? error.message : String(error)
        })
      );
    }
  }

  await cleanupOldAlerts().catch(() => undefined);
}
