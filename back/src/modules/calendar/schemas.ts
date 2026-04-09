import { z } from "zod";

const calendarEventSchema = z.object({
  id: z.string().min(1).max(200),
  title: z.string().max(300),
  startsAt: z.string().min(1),
  endsAt: z.string().min(1).nullable(),
  isAllDay: z.boolean(),
  location: z.string().max(500).nullable()
});

const calendarDaySchema = z.object({
  key: z.enum(["today", "tomorrow"]),
  date: z.string().min(1),
  events: z.array(calendarEventSchema).max(50)
});

export const calendarTravelPlanSchema = z.object({
  days: z.array(calendarDaySchema).length(2),
  preferredMode: z.enum(["driving", "transit"]).optional(),
  currentLocation: z
    .object({
      lat: z.number().min(-90).max(90),
      lng: z.number().min(-180).max(180)
    })
    .optional()
});
