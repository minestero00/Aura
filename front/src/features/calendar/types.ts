export interface CalendarAgendaEvent {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string | null;
  isAllDay: boolean;
  location: string | null;
  source?: "google" | "device";
}

export interface CalendarAgendaDay {
  key: "today" | "tomorrow";
  date: string;
  events: CalendarAgendaEvent[];
}

export interface CalendarAgendaResponse {
  days: CalendarAgendaDay[];
}

export interface CalendarTravelHint {
  eventId: string;
  dayKey: "today" | "tomorrow";
  source: "current-location" | "previous-event";
  travelMode: "driving" | "transit" | "walking";
  originLabel: string;
  destinationLabel: string;
  durationMinutes: number;
  recommendedDepartureAt: string;
  isTightTransfer: boolean;
}

export interface CalendarTravelPlanRequest {
  days: CalendarAgendaDay[];
  preferredMode?: "driving" | "transit";
  currentLocation?: {
    lat: number;
    lng: number;
  };
}

export interface CalendarTravelPlanResponse {
  hints: CalendarTravelHint[];
}
