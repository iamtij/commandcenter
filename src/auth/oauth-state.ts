import crypto from "node:crypto";

export function createOAuthState(): string {
  return crypto.randomBytes(32).toString("base64url");
}

export function verifyOAuthState(
  received: string | null | undefined,
  expected: string | null | undefined,
): boolean {
  if (!received || !expected) return false;
  const a = Buffer.from(received);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
