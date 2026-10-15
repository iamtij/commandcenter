import type { Express } from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../src/app.js";
import type { AppEnv } from "../src/config.js";
import { testEnv } from "./helpers.js";

describe("Command Center app", () => {
  let env: AppEnv;
  let fetchMock: ReturnType<typeof vi.fn>;
  let oauthMock: {
    generateAuthUrl: ReturnType<typeof vi.fn>;
    getToken: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    env = testEnv();
    fetchMock = vi.fn();
    oauthMock = {
      generateAuthUrl: vi.fn(() => "https://accounts.google.com/o/oauth2/v2/auth"),
      getToken: vi.fn(),
    };
  });

  function buildApp() {
    const { app } = createApp(env, {
      fetchImpl: fetchMock as unknown as typeof fetch,
      oauth2Factory: () => oauthMock as never,
    });
    return app as Express;
  }

  it("redirects unauthenticated HTML requests to Google sign-in", async () => {
    const app = buildApp();
    const res = await request(app).get("/").set("Accept", "text/html");
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe("/auth/google");
  });

  it("returns 401 for unauthenticated API requests", async () => {
    const app = buildApp();
    const res = await request(app)
      .get("/api/dashboard")
      .set("Accept", "application/json");
    expect(res.status).toBe(401);
  });

  it("returns 403 for a non-allowlisted Google email", async () => {
    oauthMock.getToken.mockResolvedValue({
      tokens: { access_token: "ya29.access" },
    });
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ email: "intruder@example.com" }),
    });

    const app = buildApp();
    const res = await request(app).get("/auth/google/callback?code=abc");
    expect(res.status).toBe(403);
    expect(res.text).toContain("403 Forbidden");
  });

  it("does not leak token strings in HTML or JSON responses", async () => {
    oauthMock.getToken.mockResolvedValue({
      tokens: { access_token: "ya29.google_access_token_secret" },
    });
    fetchMock.mockImplementation(async (url: string) => {
      if (url.includes("userinfo")) {
        return {
          ok: true,
          json: async () => ({ email: env.allowedEmail }),
        };
      }
      if (url.includes("googleapis.com/calendar")) {
        return {
          ok: true,
          json: async () => ({ items: [] }),
        };
      }
      if (url.includes("api.github.com")) {
        return { ok: true, json: async () => [] };
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });

    const app = buildApp();
    const agent = request.agent(app);
    await agent.get("/auth/google/callback?code=abc");

    const html = await agent.get("/").set("Accept", "text/html");
    expect(html.status).toBe(200);
    expect(html.text).not.toContain("ya29.google_access_token_secret");
    expect(html.text).not.toContain("ghp_super_secret_github_token_value");

    const json = await agent
      .get("/api/dashboard")
      .set("Accept", "application/json");
    expect(json.status).toBe(200);
    expect(JSON.stringify(json.body)).not.toContain(
      "ya29.google_access_token_secret",
    );
    expect(JSON.stringify(json.body)).not.toContain(
      "ghp_super_secret_github_token_value",
    );
  });

  it("renders Couldn't load when a source fails", async () => {
    oauthMock.getToken.mockResolvedValue({
      tokens: { access_token: "ya29.access" },
    });
    fetchMock.mockImplementation(async (url: string) => {
      if (url.includes("userinfo")) {
        return {
          ok: true,
          json: async () => ({ email: env.allowedEmail }),
        };
      }
      if (url.includes("googleapis.com/calendar")) {
        return { ok: false, status: 500 };
      }
      if (url.includes("api.github.com")) {
        return { ok: true, json: async () => [] };
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });

    const app = buildApp();
    const agent = request.agent(app);
    await agent.get("/auth/google/callback?code=abc");
    const res = await agent.get("/").set("Accept", "text/html");
    expect(res.text).toContain("Couldn't load");
  });

  it("caches dashboard data for about five minutes", async () => {
    oauthMock.getToken.mockResolvedValue({
      tokens: { access_token: "ya29.access" },
    });

    let calendarCalls = 0;
    fetchMock.mockImplementation(async (url: string) => {
      if (url.includes("userinfo")) {
        return {
          ok: true,
          json: async () => ({ email: env.allowedEmail }),
        };
      }
      if (url.includes("googleapis.com/calendar")) {
        calendarCalls += 1;
        return {
          ok: true,
          json: async () => ({
            items: [
              {
                id: "1",
                summary: "OLINN sync",
                start: { dateTime: new Date().toISOString() },
                end: { dateTime: new Date(Date.now() + 3600000).toISOString() },
              },
            ],
          }),
        };
      }
      if (url.includes("api.github.com")) {
        return { ok: true, json: async () => [] };
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });

    const app = buildApp();
    const agent = request.agent(app);
    await agent.get("/auth/google/callback?code=abc");

    calendarCalls = 0;
    await agent.get("/api/dashboard").set("Accept", "application/json");
    await agent.get("/api/dashboard").set("Accept", "application/json");
    expect(calendarCalls).toBe(1);
  });

  it("exposes /health without authentication", async () => {
    const app = buildApp();
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });
});
