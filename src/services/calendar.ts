import type { CalendarEvent } from "../types.js";

type GoogleEvent = {
  id: string;
  summary?: string;
  htmlLink?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
};

type EventsResponse = {
  items?: GoogleEvent[];
};

function parseEventDate(value?: { dateTime?: string; date?: string }): Date | null {
  if (!value) return null;
  const raw = value.dateTime ?? value.date;
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function startOfLocalDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export async function fetchCalendarEvents(
  accessToken: string,
  timeMin: Date,
  timeMax: Date,
  fetchImpl: typeof fetch = fetch,
): Promise<CalendarEvent[]> {
  const params = new URLSearchParams({
    singleEvents: "true",
    orderBy: "startTime",
    timeMin: timeMin.toISOString(),
    timeMax: timeMax.toISOString(),
    maxResults: "250",
  });

  const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`;
  const res = await fetchImpl(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    throw new Error(`Calendar API error ${res.status}`);
  }

  const body = (await res.json()) as EventsResponse;
  const items = body.items ?? [];

  return items
    .map((ev) => {
      const start = parseEventDate(ev.start);
      if (!start) return null;
      return {
        id: ev.id,
        title: ev.summary?.trim() || "(No title)",
        start,
        end: parseEventDate(ev.end),
        htmlLink: ev.htmlLink ?? null,
      } satisfies CalendarEvent;
    })
    .filter((ev): ev is CalendarEvent => ev !== null);
}

export function eventsToday(events: CalendarEvent[], now = new Date()): CalendarEvent[] {
  const dayStart = startOfLocalDay(now);
  const dayEnd = addDays(dayStart, 1);
  return events
    .filter((ev) => ev.start >= dayStart && ev.start < dayEnd)
    .sort((a, b) => a.start.getTime() - b.start.getTime());
}
