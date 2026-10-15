export type AppEnv = {
  port: number;
  googleClientId: string;
  googleClientSecret: string;
  googleRedirectUri: string;
  sessionSecret: string;
  sessionStorePath: string;
  allowedEmail: string;
  githubToken: string;
  nodeEnv: string;
};

const MIN_SESSION_SECRET_LENGTH = 32;

export function loadEnv(
  source: NodeJS.ProcessEnv = process.env,
): AppEnv {
  const required = [
    "GOOGLE_CLIENT_ID",
    "GOOGLE_CLIENT_SECRET",
    "GOOGLE_REDIRECT_URI",
    "SESSION_SECRET",
    "ALLOWED_EMAIL",
    "GITHUB_TOKEN",
  ] as const;

  for (const key of required) {
    if (!source[key]?.trim()) {
      throw new Error(`Missing required env var: ${key}`);
    }
  }

  const port = Number(source.PORT ?? "3000");
  if (!Number.isFinite(port) || port <= 0) {
    throw new Error("PORT must be a positive number");
  }

  const sessionSecret = source.SESSION_SECRET!.trim();
  if (sessionSecret.length < MIN_SESSION_SECRET_LENGTH) {
    throw new Error(
      `SESSION_SECRET must be at least ${MIN_SESSION_SECRET_LENGTH} characters`,
    );
  }

  return {
    port,
    googleClientId: source.GOOGLE_CLIENT_ID!.trim(),
    googleClientSecret: source.GOOGLE_CLIENT_SECRET!.trim(),
    googleRedirectUri: source.GOOGLE_REDIRECT_URI!.trim(),
    sessionSecret,
    sessionStorePath: source.SESSION_STORE_PATH?.trim() || "./data/sessions",
    allowedEmail: source.ALLOWED_EMAIL!.trim().toLowerCase(),
    githubToken: source.GITHUB_TOKEN!.trim(),
    nodeEnv: source.NODE_ENV ?? "development",
  };
}
