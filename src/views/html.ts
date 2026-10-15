import type { DashboardData, ProjectRow } from "../types.js";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatEventWhen(date: Date): string {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const eventDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round(
    (eventDay.getTime() - today.getTime()) / (24 * 60 * 60 * 1000),
  );
  const time = formatTime(date);
  if (diffDays === 0) return `Today ${time}`;
  if (diffDays === 1) return `Tomorrow ${time}`;
  return `${date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })} ${time}`;
}

function renderCounts(row: ProjectRow): string {
  const primary =
    row.openCount === 1 ? "1 open PR" : `${row.openCount} open PRs`;
  if (row.draftCount === 0) return escapeHtml(primary);
  const drafts =
    row.draftCount === 1 ? "1 draft" : `${row.draftCount} drafts`;
  return `${escapeHtml(primary)} · ${escapeHtml(drafts)}`;
}

function renderProjectRow(row: ProjectRow): string {
  const next =
    row.calendarOk && row.nextEvent
      ? escapeHtml(formatEventWhen(row.nextEvent.start)) +
        " · " +
        escapeHtml(row.nextEvent.title)
      : row.calendarOk
        ? "No upcoming meeting"
        : "Couldn't load calendar";

  const prLines = row.githubOk
    ? row.pullRequests
        .map((pr) => {
          const tag = pr.draft ? "draft" : "open";
          return `<li><a href="${escapeHtml(pr.htmlUrl)}" rel="noopener noreferrer">#${pr.number} ${escapeHtml(pr.title)}</a> <span class="tag">${tag}</span></li>`;
        })
        .join("")
    : `<li class="muted">Couldn't load PRs</li>`;

  const eventLines = row.calendarOk
    ? row.events
        .map((ev) => {
          const href = ev.htmlLink
            ? ` href="${escapeHtml(ev.htmlLink)}" rel="noopener noreferrer"`
            : "";
          const tag = href ? "a" : "span";
          return `<li><${tag}${href}>${escapeHtml(formatEventWhen(ev.start))} · ${escapeHtml(ev.title)}</${tag}></li>`;
        })
        .join("")
    : `<li class="muted">Couldn't load events</li>`;

  return `
    <details class="project">
      <summary>
        <span class="dot dot-${row.status}" aria-hidden="true"></span>
        <span class="project-name">${escapeHtml(row.label)}</span>
        <span class="project-meta">${renderCounts(row)}</span>
        <span class="project-next">${next}</span>
      </summary>
      <div class="project-body">
        <p class="section-label">Pull requests</p>
        <ul>${prLines || '<li class="muted">Nothing open</li>'}</ul>
        <p class="section-label">Calendar</p>
        <ul>${eventLines || '<li class="muted">No matching events</li>'}</ul>
      </div>
    </details>`;
}

export function renderPage(data: DashboardData): string {
  const meetings =
    data.calendar.ok && data.todayMeetings.length > 0
      ? data.todayMeetings
          .map((ev) => {
            const href = ev.htmlLink
              ? ` href="${escapeHtml(ev.htmlLink)}" rel="noopener noreferrer"`
              : "";
            const tag = href ? "a" : "span";
            return `<li><span class="time">${escapeHtml(formatTime(ev.start))}</span> <${tag}${href}>${escapeHtml(ev.title)}</${tag}></li>`;
          })
          .join("")
      : data.calendar.ok
        ? '<li class="muted">No meetings today</li>'
        : '<li class="muted">Couldn\'t load</li>';

  const projects = data.projects.map(renderProjectRow).join("");

  const updated = data.cachedAt
    ? escapeHtml(data.cachedAt.toLocaleTimeString())
    : "just now";

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex, nofollow">
  <title>Command Center</title>
  <link rel="stylesheet" href="/styles.css">
</head>
<body>
  <header>
    <h1>Command Center</h1>
    <div class="actions">
      <span class="updated">Updated ${updated}</span>
      <form method="post" action="/refresh"><button type="submit">Refresh</button></form>
      <a class="btn" href="/auth/logout">Sign out</a>
    </div>
  </header>
  <main>
    <section aria-label="Today">
      <h2>Today</h2>
      <div class="today-strip"><ul>${meetings}</ul></div>
    </section>
    <section aria-label="Projects">
      <h2>Projects</h2>
      ${projects}
    </section>
  </main>
</body>
</html>`;
}

export function renderForbidden(): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex, nofollow">
  <title>Forbidden</title>
  <link rel="stylesheet" href="/styles.css">
</head>
<body>
  <main class="forbidden">
    <h1>403 Forbidden</h1>
    <p>This app is private. Your Google account is not allowed to sign in.</p>
  </main>
</body>
</html>`;
}
