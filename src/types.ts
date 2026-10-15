import type { SessionData as ExpressSessionData } from "express-session";

export type SessionUser = {
  email: string;
  googleAccessToken: string;
};

declare module "express-session" {
  interface SessionData {
    user?: SessionUser;
  }
}

export type CalendarEvent = {
  id: string;
  title: string;
  start: Date;
  end: Date | null;
  htmlLink: string | null;
};

export type PullRequest = {
  number: number;
  title: string;
  htmlUrl: string;
  draft: boolean;
  updatedAt: string;
};

export type SourceResult<T> =
  | { ok: true; data: T; fetchedAt: Date }
  | { ok: false; error: string; fetchedAt: Date };

export type ProjectRow = {
  id: string;
  label: string;
  status: "green" | "amber" | "red" | "grey";
  openCount: number;
  draftCount: number;
  nextEvent: CalendarEvent | null;
  calendarOk: boolean;
  githubOk: boolean;
  pullRequests: PullRequest[];
  events: CalendarEvent[];
};

export type DashboardData = {
  todayMeetings: CalendarEvent[];
  projects: ProjectRow[];
  calendar: SourceResult<CalendarEvent[]>;
  github: SourceResult<Record<string, PullRequest[]>>;
  cachedAt: Date | null;
};

export type { ExpressSessionData };
