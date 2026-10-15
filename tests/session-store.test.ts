import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { Express } from "express";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../src/app.js";
import type { AppEnv } from "../src/config.js";
import {
  captureOAuthState,
  completeOAuthCallback,
  mockAuthedFetch,
  testEnv,
} from "./helpers.js";

describe("production session file store", () => {
  let env: AppEnv;
  let fetchMock: ReturnType<typeof vi.fn>;
  let oauthMock: {
    generateAuthUrl: ReturnType<typeof vi.fn>;
    getToken: ReturnType<typeof vi.fn>;
  };
  let sessionStorePath: string;

  beforeEach(async () => {
    sessionStorePath = await fs.mkdtemp(
      path.join(os.tmpdir(), "cc-session-store-"),
    );
    env = testEnv({
      nodeEnv: "production",
      sessionStorePath,
    });
    fetchMock = vi.fn();
    oauthMock = {
      generateAuthUrl: vi.fn((opts: { state?: string }) => {
        return `https://accounts.google.com/o/oauth2/v2/auth?state=${opts.state ?? ""}`;
      }),
      getToken: vi.fn(),
    };
  });

  afterEach(async () => {
    await fs.rm(sessionStorePath, { recursive: true, force: true });
  });

  function buildApp() {
    const { app } = createApp(env, {
      fetchImpl: fetchMock as unknown as typeof fetch,
      oauth2Factory: () => oauthMock as never,
    });
    return app as Express;
  }

  it("does not write the Google access token to session files in plaintext", async () => {
    const tokenMarker = "ya29.plaintext_token_marker_for_disk_test";
    oauthMock.getToken.mockResolvedValue({
      tokens: { access_token: tokenMarker },
    });
    mockAuthedFetch(fetchMock, env);

    const app = buildApp();
    const agent = request.agent(app);
    await agent.get("/auth/google");
    const state = captureOAuthState(oauthMock);
    await completeOAuthCallback(agent, state);
    await agent.get("/").set("Accept", "text/html");

    const files = await fs.readdir(sessionStorePath);
    expect(files.length).toBeGreaterThan(0);

    for (const file of files) {
      const content = await fs.readFile(
        path.join(sessionStorePath, file),
        "utf8",
      );
      expect(content).not.toContain(tokenMarker);
      expect(content).not.toContain("googleAccessToken");
    }
  });
});
