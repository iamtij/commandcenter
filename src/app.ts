import express from "express";
import session from "express-session";
import { OAuth2Client } from "google-auth-library";
import type { AppEnv } from "./config.js";
import { TtlCache } from "./cache.js";
import { requireAuth } from "./middleware/auth.js";
import { securityHeaders } from "./middleware/security.js";
import {
  CACHE_TTL_MS,
  assembleDashboard,
  loadDashboardSources,
} from "./services/dashboard.js";
import type { DashboardData } from "./types.js";
import { renderForbidden, renderPage } from "./views/html.js";

export type AppDeps = {
  fetchImpl?: typeof fetch;
  oauth2Factory?: (env: AppEnv) => OAuth2Client;
};

export function createApp(env: AppEnv, deps: AppDeps = {}) {
  const fetchImpl = deps.fetchImpl ?? fetch;
  const oauth2Factory =
    deps.oauth2Factory ??
    ((config: AppEnv) =>
      new OAuth2Client(
        config.googleClientId,
        config.googleClientSecret,
        config.googleRedirectUri,
      ));

  const app = express();
  const dashboardCache = new TtlCache<DashboardData>(CACHE_TTL_MS);

  app.set("trust proxy", 1);
  app.use(securityHeaders);
  app.use(express.urlencoded({ extended: false }));

  app.use(
    session({
      name: "cc.sid",
      secret: env.sessionSecret,
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        secure: env.nodeEnv === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      },
    }),
  );

  app.get("/health", (_req, res) => {
    res.status(200).json({ ok: true });
  });

  const oauth2 = oauth2Factory(env);
  const scopes = [
    "https://www.googleapis.com/auth/calendar.readonly",
    "https://www.googleapis.com/auth/userinfo.email",
  ];

  app.get("/auth/google", (_req, res) => {
    const url = oauth2.generateAuthUrl({
      access_type: "online",
      prompt: "select_account",
      scope: scopes,
    });
    res.redirect(url);
  });

  app.get("/auth/google/callback", async (req, res) => {
    const code = typeof req.query.code === "string" ? req.query.code : null;
    if (!code) {
      res.status(400).send("Missing authorization code");
      return;
    }

    try {
      const { tokens } = await oauth2.getToken(code);
      if (!tokens.access_token) {
        res.status(400).send("Missing access token");
        return;
      }

      const userRes = await fetchImpl(
        "https://www.googleapis.com/oauth2/v2/userinfo",
        {
          headers: { Authorization: `Bearer ${tokens.access_token}` },
        },
      );
      if (!userRes.ok) {
        res.status(502).send("Could not load Google profile");
        return;
      }

      const profile = (await userRes.json()) as { email?: string };
      const email = profile.email?.trim().toLowerCase();
      if (!email) {
        res.status(502).send("Google profile missing email");
        return;
      }

      if (email !== env.allowedEmail) {
        req.session.destroy(() => {
          res.status(403).send(renderForbidden());
        });
        return;
      }

      req.session.user = {
        email,
        googleAccessToken: tokens.access_token,
      };
      dashboardCache.delete(email);
      res.redirect("/");
    } catch {
      res.status(500).send("Sign-in failed");
    }
  });

  app.get("/auth/logout", (req, res) => {
    const email = req.session.user?.email;
    req.session.destroy(() => {
      if (email) dashboardCache.delete(email);
      res.redirect("/auth/google");
    });
  });

  async function getDashboard(email: string, token: string, bust = false) {
    if (!bust) {
      const cached = dashboardCache.get(email);
      if (cached) return cached;
    }

    const { calendar, github } = await loadDashboardSources(
      token,
      env.githubToken,
      fetchImpl,
    );
    const cachedAt = new Date();
    const dashboard = assembleDashboard(calendar, github, cachedAt);
    dashboardCache.set(email, dashboard);
    return dashboard;
  }

  app.get("/", requireAuth, async (req, res) => {
    const user = req.session.user!;
    const dashboard = await getDashboard(user.email, user.googleAccessToken);
    res.status(200).send(renderPage(dashboard));
  });

  app.get("/api/dashboard", requireAuth, async (req, res) => {
    const user = req.session.user!;
    const dashboard = await getDashboard(user.email, user.googleAccessToken);
    res.json({
      cachedAt: dashboard.cachedAt?.toISOString() ?? null,
      todayCount: dashboard.todayMeetings.length,
      projects: dashboard.projects.map((p) => ({
        id: p.id,
        label: p.label,
        status: p.status,
        openCount: p.openCount,
        draftCount: p.draftCount,
        calendarOk: p.calendarOk,
        githubOk: p.githubOk,
      })),
      calendarOk: dashboard.calendar.ok,
      githubOk: dashboard.github.ok,
    });
  });

  app.post("/refresh", requireAuth, async (req, res) => {
    const user = req.session.user!;
    await getDashboard(user.email, user.googleAccessToken, true);
    res.redirect("/");
  });

  return { app, dashboardCache };
}
