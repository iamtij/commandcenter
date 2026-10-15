import type { SuperAgentTest } from "supertest";
import type { AppEnv } from "../src/config.js";

export const TEST_SESSION_SECRET =
  "01234567890123456789012345678901";

export function testEnv(overrides: Partial<AppEnv> = {}): AppEnv {
  return {
    port: 3456,
    googleClientId: "test-client-id",
    googleClientSecret: "test-client-secret",
    googleRedirectUri: "http://127.0.0.1:3456/auth/google/callback",
    sessionSecret: TEST_SESSION_SECRET,
    sessionStorePath: "./data/test-sessions",
    allowedEmail: "tj@example.com",
    githubToken: "ghp_super_secret_github_token_value",
    nodeEnv: "test",
    ...overrides,
  };
}

export function verifiedProfile(email: string) {
  return { email, verified_email: true };
}

export function sessionCookieValue(
  setCookie: string | string[] | undefined,
): string | undefined {
  if (!setCookie) return undefined;
  const lines = Array.isArray(setCookie) ? setCookie : [setCookie];
  for (const line of lines) {
    const match = line.match(/^cc\.sid=([^;]+)/);
    if (match) return match[1];
  }
  return undefined;
}

export type OAuthMocks = {
  generateAuthUrl: ReturnType<typeof import("vitest").vi.fn>;
  getToken: ReturnType<typeof import("vitest").vi.fn>;
};

export function captureOAuthState(oauthMock: OAuthMocks): string {
  const call = oauthMock.generateAuthUrl.mock.calls.at(-1)?.[0] as
    | { state?: string }
    | undefined;
  if (!call?.state) {
    throw new Error("Expected OAuth state in generateAuthUrl call");
  }
  return call.state;
}

export async function completeOAuthCallback(
  agent: SuperAgentTest,
  state: string,
  code = "abc",
) {
  return agent.get(
    `/auth/google/callback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`,
  );
}

export function mockAuthedFetch(
  fetchMock: ReturnType<typeof import("vitest").vi.fn>,
  env: AppEnv,
  options: { calendarOk?: boolean } = {},
) {
  const calendarOk = options.calendarOk ?? true;
  fetchMock.mockImplementation(async (url: string) => {
    if (url.includes("userinfo")) {
      return {
        ok: true,
        json: async () => verifiedProfile(env.allowedEmail),
      };
    }
    if (url.includes("googleapis.com/calendar")) {
      if (!calendarOk) return { ok: false, status: 500 };
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
}
