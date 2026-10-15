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
  <style>
    :root {
      color-scheme: light;
      --bg: #fafafa;
      --text: #111;
      --muted: #666;
      --border: #e5e5e5;
      --accent: #2563eb;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: system-ui, -apple-system, Segoe UI, sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.4;
    }
    header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 12px 16px;
      border-bottom: 1px solid var(--border);
      background: #fff;
      position: sticky;
      top: 0;
      z-index: 1;
    }
    header h1 {
      font-size: 1rem;
      margin: 0;
      font-weight: 600;
    }
    header .actions {
      display: flex;
      gap: 8px;
      align-items: center;
      font-size: 0.85rem;
    }
    button, .btn {
      border: 1px solid var(--border);
      background: #fff;
      border-radius: 8px;
      padding: 6px 10px;
      font: inherit;
      cursor: pointer;
    }
    main { padding: 12px 16px 32px; max-width: 720px; margin: 0 auto; }
    section { margin-bottom: 16px; }
    h2 {
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--muted);
      margin: 0 0 8px;
      font-weight: 600;
    }
    .today-strip {
      background: #fff;
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 8px 12px;
    }
    .today-strip ul, .project-body ul {
      list-style: none;
      margin: 0;
      padding: 0;
    }
    .today-strip li, .project-body li {
      padding: 6px 0;
      border-bottom: 1px solid var(--border);
      font-size: 0.95rem;
    }
    .today-strip li:last-child, .project-body li:last-child { border-bottom: 0; }
    .time { color: var(--muted); margin-right: 8px; font-variant-numeric: tabular-nums; }
    a { color: var(--accent); text-decoration: none; }
    a:hover { text-decoration: underline; }
    .muted { color: var(--muted); }
    details.project {
      background: #fff;
      border: 1px solid var(--border);
      border-radius: 12px;
      margin-bottom: 8px;
      overflow: hidden;
    }
    details.project summary {
      list-style: none;
      cursor: pointer;
      padding: 12px;
      display: grid;
      grid-template-columns: auto 1fr;
      gap: 4px 10px;
      align-items: center;
    }
    details.project summary::-webkit-details-marker { display: none; }
    .dot {
      width: 10px;
      height: 10px;
      border-radius: 999px;
      grid-row: span 2;
    }
    .dot-green { background: #16a34a; }
    .dot-amber { background: #d97706; }
    .dot-red { background: #dc2626; }
    .dot-grey { background: #9ca3af; }
    .project-name { font-weight: 600; }
    .project-meta, .project-next { font-size: 0.85rem; color: var(--muted); grid-column: 2; }
    .project-body {
      border-top: 1px solid var(--border);
      padding: 8px 12px 12px 36px;
    }
    .section-label {
      margin: 8px 0 4px;
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--muted);
    }
    .tag {
      font-size: 0.75rem;
      color: var(--muted);
      margin-left: 6px;
    }
    .updated { color: var(--muted); font-size: 0.8rem; }
  </style>
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
</head>
<body>
  <main style="font-family: system-ui; padding: 24px;">
    <h1>403 Forbidden</h1>
    <p>This app is private. Your Google account is not allowed to sign in.</p>
  </main>
</body>
</html>`;
}
