import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TtlCache } from "../src/cache.js";

describe("TtlCache", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("expires entries after the TTL", () => {
    const cache = new TtlCache<string>(5 * 60 * 1000);
    cache.set("key", "value");
    expect(cache.get("key")).toBe("value");

    vi.advanceTimersByTime(5 * 60 * 1000);
    expect(cache.get("key")).toBeUndefined();
  });
});
