import { PROJECTS, matchProject } from "../projects.js";
import type {
  CalendarEvent,
  DashboardData,
  ProjectRow,
  PullRequest,
  SourceResult,
} from "../types.js";
import { addDays, eventsToday, fetchCalendarEvents, startOfLocalDay } from "./calendar.js";
import { fetchAllRepoPulls } from "./github.js";

const CACHE_TTL_MS = 5 * 60 * 1000;

export { CACHE_TTL_MS };

function projectStatus(
  openCount: number,
  draftCount: number,
  githubOk: boolean,
): ProjectRow["status"] {
  if (!githubOk) return "grey";
  if (openCount > 0) return "red";
  if (draftCount > 0) return "amber";
  return "green";
}

function nextEventForProject(
  events: CalendarEvent[],
  projectId: string,
  now: Date,
): CalendarEvent | null {
  const future = events
    .filter((ev) => {
      const match = matchProject(ev.title);
      return match?.id === projectId && ev.start >= now;
    })
    .sort((a, b) => a.start.getTime() - b.start.getTime());
  return future[0] ?? null;
}

function eventsForProject(events: CalendarEvent[], projectId: string): CalendarEvent[] {
  return events
    .filter((ev) => matchProject(ev.title)?.id === projectId)
    .sort((a, b) => a.start.getTime() - b.start.getTime());
}

function buildProjects(
  calendarResult: SourceResult<CalendarEvent[]>,
  githubResult: SourceResult<Record<string, PullRequest[]>>,
  now: Date,
): ProjectRow[] {
  const events = calendarResult.ok ? calendarResult.data : [];
  const pullsByRepo = githubResult.ok ? githubResult.data : {};

  return PROJECTS.map((project) => {
    const repoKey = `${project.owner}/${project.repo}`;
    const githubOk = githubResult.ok;
    const calendarOk = calendarResult.ok;
    const prs = githubOk ? (pullsByRepo[repoKey] ?? []) : [];
    const openCount = prs.filter((pr) => !pr.draft).length;
    const draftCount = prs.filter((pr) => pr.draft).length;

    let status = projectStatus(openCount, draftCount, githubOk);
    if (!calendarOk && githubOk) {
      // PR data loaded; keep PR-derived status
    } else if (!calendarOk && !githubOk) {
      status = "grey";
    }

    return {
      id: project.id,
      label: project.label,
      status,
      openCount,
      draftCount,
      nextEvent: calendarOk ? nextEventForProject(events, project.id, now) : null,
      calendarOk,
      githubOk,
      pullRequests: prs,
      events: calendarOk ? eventsForProject(events, project.id) : [],
    };
  });
}

export async function loadDashboardSources(
  googleAccessToken: string,
  githubToken: string,
  fetchImpl: typeof fetch = fetch,
): Promise<Pick<DashboardData, "calendar" | "github">> {
  const now = new Date();
  const timeMin = startOfLocalDay(now);
  const timeMax = addDays(timeMin, 8);

  const [calendar, github] = await Promise.all([
    (async (): Promise<SourceResult<CalendarEvent[]>> => {
      const fetchedAt = new Date();
      try {
        const data = await fetchCalendarEvents(
          googleAccessToken,
          timeMin,
          timeMax,
          fetchImpl,
        );
        return { ok: true, data, fetchedAt };
      } catch {
        return { ok: false, error: "calendar", fetchedAt };
      }
    })(),
    (async (): Promise<SourceResult<Record<string, PullRequest[]>>> => {
      const fetchedAt = new Date();
      try {
        const data = await fetchAllRepoPulls(
          PROJECTS.map((p) => ({
            owner: p.owner,
            repo: p.repo,
            key: `${p.owner}/${p.repo}`,
          })),
          githubToken,
          fetchImpl,
        );
        return { ok: true, data, fetchedAt };
      } catch {
        return { ok: false, error: "github", fetchedAt };
      }
    })(),
  ]);

  return { calendar, github };
}

export function assembleDashboard(
  calendar: SourceResult<CalendarEvent[]>,
  github: SourceResult<Record<string, PullRequest[]>>,
  cachedAt: Date | null,
  now = new Date(),
): DashboardData {
  const todayMeetings = calendar.ok ? eventsToday(calendar.data, now) : [];
  const projects = buildProjects(calendar, github, now);

  return {
    todayMeetings,
    projects,
    calendar,
    github,
    cachedAt,
  };
}
