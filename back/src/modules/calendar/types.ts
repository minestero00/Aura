export interface CalendarAgendaEvent {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string | null;
  isAllDay: boolean;
  location: string | null;
}

export interface CalendarAgendaDay {
  key: "today" | "tomorrow";
  date: string;
  events: CalendarAgendaEvent[];
}

export interface CalendarTravelPlanRequest {
  days: CalendarAgendaDay[];
  preferredMode?: "driving" | "transit";
  currentLocation?: {
    lat: number;
    lng: number;
  };
}

export interface CalendarTravelHintsByMode {
  transit: CalendarTravelHint[];
  driving: CalendarTravelHint[];
}

export interface CalendarTravelHint {
  eventId: string;
  dayKey: "today" | "tomorrow";
  source: "current-location" | "previous-event";
  travelMode: "driving" | "transit" | "walking";
  estimateSource: "maps" | "derived";
  originLabel: string;
  destinationLabel: string;
  originQuery: string | null;
  destinationQuery: string | null;
  durationMinutes: number;
  recommendedDepartureAt: string;
  isTightTransfer: boolean;
}
