import { describe, expect, it } from "vitest";
import { createOAuthState, verifyOAuthState } from "../src/auth/oauth-state.js";

describe("verifyOAuthState", () => {
  it("accepts matching state values", () => {
    const state = createOAuthState();
    expect(verifyOAuthState(state, state)).toBe(true);
  });

  it("rejects missing or mismatched state", () => {
    const state = createOAuthState();
    expect(verifyOAuthState(undefined, state)).toBe(false);
    expect(verifyOAuthState(state, undefined)).toBe(false);
    expect(verifyOAuthState(state, state.slice(0, -1) + "x")).toBe(false);
  });
});
