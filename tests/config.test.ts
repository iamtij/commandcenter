import { describe, expect, it } from "vitest";
import { loadEnv } from "../src/config.js";
import { TEST_SESSION_SECRET } from "./helpers.js";

function baseEnv(): NodeJS.ProcessEnv {
  return {
    GOOGLE_CLIENT_ID: "id",
    GOOGLE_CLIENT_SECRET: "secret",
    GOOGLE_REDIRECT_URI: "http://localhost/callback",
    SESSION_SECRET: TEST_SESSION_SECRET,
    ALLOWED_EMAIL: "tj@example.com",
    GITHUB_TOKEN: "ghp_token",
  };
}

describe("loadEnv", () => {
  it("refuses to boot when SESSION_SECRET is shorter than 32 characters", () => {
    expect(() =>
      loadEnv({ ...baseEnv(), SESSION_SECRET: "too-short" }),
    ).toThrow(/SESSION_SECRET must be at least 32 characters/);
  });
});
