import { describe, expect, it } from "vitest";
import { PoseEngineError } from "./processingErrors";
import type { ProcessingFailureKind, ProcessingStage } from "@/types";

describe("PoseEngineError", () => {
  it("subclasses Error and sets name correctly", () => {
    const error = new PoseEngineError("Something went wrong");
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(PoseEngineError);
    expect(error.name).toBe("PoseEngineError");
    expect(error.message).toBe("Something went wrong");
    expect(error.stack).toBeDefined();
    expect(error.stack).toContain("PoseEngineError");
  });

  it("defaults kind to 'detect' and stage to undefined when omitted", () => {
    const error = new PoseEngineError("Detection failed");
    expect(error.kind).toBe("detect");
    expect(error.stage).toBeUndefined();
  });

  it("attaches explicit kind and stage properties", () => {
    const error = new PoseEngineError("Metadata timed out", "timeout", "metadata");
    expect(error.message).toBe("Metadata timed out");
    expect(error.kind).toBe("timeout");
    expect(error.stage).toBe("metadata");
  });

  it("supports all documented failure kinds", () => {
    const kinds: ProcessingFailureKind[] = [
      "init",
      "video-load",
      "no-duration",
      "aborted",
      "detect",
      "timeout",
      "busy",
      "validation",
    ];

    for (const kind of kinds) {
      const err = new PoseEngineError(`Failure with kind: ${kind}`, kind);
      expect(err.kind).toBe(kind);
    }
  });

  it("supports all documented processing stages", () => {
    const stages: ProcessingStage[] = [
      "metadata",
      "initialization",
      "seek",
      "processing",
    ];

    for (const stage of stages) {
      const err = new PoseEngineError(`Failure at stage: ${stage}`, "detect", stage);
      expect(err.stage).toBe(stage);
    }
  });

  it("can be thrown and caught with type inspection", () => {
    const thrower = () => {
      throw new PoseEngineError("Invalid upload dimensions", "validation", "metadata");
    };

    expect(thrower).toThrow(PoseEngineError);
    expect(thrower).toThrow("Invalid upload dimensions");

    try {
      thrower();
    } catch (e) {
      expect(e).toBeInstanceOf(PoseEngineError);
      if (e instanceof PoseEngineError) {
        expect(e.kind).toBe("validation");
        expect(e.stage).toBe("metadata");
        expect(e.message).toBe("Invalid upload dimensions");
      }
    }
  });
});
