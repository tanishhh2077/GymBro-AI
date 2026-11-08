import { describe, expect, it } from "vitest";
import { M1_LIMITS, type ProcessingLimits } from "./processingLimits";

describe("M1_LIMITS", () => {
  it("freezes the limits object to prevent runtime modification", () => {
    expect(Object.isFrozen(M1_LIMITS)).toBe(true);
    expect(() => {
      // @ts-expect-error mutating frozen object
      M1_LIMITS.maxDurationSeconds = 120;
    }).toThrow();
  });

  it("matches documented milestone 1 limits exactly", () => {
    // 100 MiB = 100 * 1024 * 1024 bytes
    expect(M1_LIMITS.maxFileBytes).toBe(104_857_600);
    // 60 seconds duration limit
    expect(M1_LIMITS.maxDurationSeconds).toBe(60);
    // 1920 px maximum on the longest side
    expect(M1_LIMITS.maxLongEdge).toBe(1920);
    // 2,073,600 pixels (1920 x 1080)
    expect(M1_LIMITS.maxPixels).toBe(2_073_600);
    // 30 fps target sampling rate
    expect(M1_LIMITS.targetFps).toBe(30);
  });

  it("matches documented asynchronous timeout budgets", () => {
    // 10s metadata probe timeout
    expect(M1_LIMITS.metadataTimeoutMs).toBe(10_000);
    // 60s runtime initialization and model creation timeout
    expect(M1_LIMITS.initializationTimeoutMs).toBe(60_000);
    // 10s seek and frame-ready timeout
    expect(M1_LIMITS.seekTimeoutMs).toBe(10_000);
    // 300s (5 minutes) total processing timeout
    expect(M1_LIMITS.totalTimeoutMs).toBe(300_000);
  });

  it("ensures all limit properties are positive finite integers", () => {
    const keys: Array<keyof ProcessingLimits> = [
      "maxFileBytes",
      "maxDurationSeconds",
      "maxLongEdge",
      "maxPixels",
      "targetFps",
      "metadataTimeoutMs",
      "initializationTimeoutMs",
      "seekTimeoutMs",
      "totalTimeoutMs",
    ];

    for (const key of keys) {
      const val = M1_LIMITS[key];
      expect(typeof val).toBe("number");
      expect(Number.isFinite(val)).toBe(true);
      expect(Number.isInteger(val)).toBe(true);
      expect(val).toBeGreaterThan(0);
    }
  });

  it("maintains consistent timeout relationships", () => {
    // Step timeouts must be strictly less than the total timeout budget
    expect(M1_LIMITS.metadataTimeoutMs).toBeLessThan(M1_LIMITS.totalTimeoutMs);
    expect(M1_LIMITS.initializationTimeoutMs).toBeLessThan(M1_LIMITS.totalTimeoutMs);
    expect(M1_LIMITS.seekTimeoutMs).toBeLessThan(M1_LIMITS.totalTimeoutMs);
  });

  it("accommodates 1080p full HD resolution within the pixel and edge budgets", () => {
    const fullHdWidth = 1920;
    const fullHdHeight = 1080;
    expect(Math.max(fullHdWidth, fullHdHeight)).toBeLessThanOrEqual(M1_LIMITS.maxLongEdge);
    expect(fullHdWidth * fullHdHeight).toBeLessThanOrEqual(M1_LIMITS.maxPixels);
  });
});
