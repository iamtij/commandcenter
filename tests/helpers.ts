import type { AppEnv } from "../src/config.js";

export function testEnv(overrides: Partial<AppEnv> = {}): AppEnv {
  return {
    port: 3456,
    googleClientId: "test-client-id",
    googleClientSecret: "test-client-secret",
    googleRedirectUri: "http://127.0.0.1:3456/auth/google/callback",
    sessionSecret: "test-session-secret-value",
    allowedEmail: "tj@example.com",
    githubToken: "ghp_super_secret_github_token_value",
    nodeEnv: "test",
    ...overrides,
  };
}
