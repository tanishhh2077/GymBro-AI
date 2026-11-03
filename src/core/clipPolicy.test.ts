import { describe, expect, it } from "vitest";
import { validateSelection, type FileInfo } from "./clipPolicy";
import { M1_LIMITS } from "./processingLimits";

// Lightweight descriptions stand in for File objects, so no 100 MiB allocation.
function file(name: string, size = 1_000, type = "video/mp4"): FileInfo {
  return { name, size, type };
}

describe("validateSelection", () => {
  it("accepts exactly one non-empty MP4 within the size limit", () => {
    expect(validateSelection([file("bench-set.mp4")])).toBeNull();
  });

  it("rejects an empty selection", () => {
    expect(validateSelection([])).toMatchObject({ code: "file-count" });
  });

  it("rejects more than one file instead of silently picking one", () => {
    expect(validateSelection([file("a.mp4"), file("b.mp4")])).toMatchObject({ code: "file-count" });
  });

  it("rejects a zero-byte file", () => {
    expect(validateSelection([file("set.mp4", 0)])).toMatchObject({ code: "empty" });
  });

  it.each(["set.webm", "set.mov", "set.mkv", "set", "set.mp4.exe"])(
    "rejects a non-MP4 filename: %j", (name) => {
      expect(validateSelection([file(name)])).toMatchObject({ code: "format" });
    },
  );

  it.each(["set.MP4", "set.Mp4", "my.bench.set.mp4"])("accepts the MP4 extension case-insensitively: %s", (name) => {
    expect(validateSelection([file(name)])).toBeNull();
  });

  it.each(["", "application/octet-stream"])("does not reject an MP4 name for an opaque MIME type %j", (type) => {
    expect(validateSelection([file("set.mp4", 1_000, type)])).toBeNull();
  });

  it("does not accept a non-MP4 name because the MIME type claims MP4", () => {
    expect(validateSelection([file("set.mov", 1_000, "video/mp4")])).toMatchObject({ code: "format" });
  });

  it("accepts a file of exactly the byte limit and rejects one byte more", () => {
    expect(M1_LIMITS.maxFileBytes).toBe(104_857_600);
    expect(validateSelection([file("set.mp4", 104_857_600)])).toBeNull();
    expect(validateSelection([file("set.mp4", 104_857_601)])).toMatchObject({ code: "size" });
  });

  it("applies caller-supplied limits", () => {
    const limits = { ...M1_LIMITS, maxFileBytes: 10 };
    expect(validateSelection([file("set.mp4", 10)], limits)).toBeNull();
    expect(validateSelection([file("set.mp4", 11)], limits)).toMatchObject({ code: "size" });
  });

  it.each([NaN, 0, -1, Infinity])("throws for an invalid size limit %s instead of accepting any size", (maxFileBytes) => {
    expect(() => validateSelection([file("set.mp4")], { ...M1_LIMITS, maxFileBytes })).toThrow(RangeError);
  });

  it("gives every rejection a readable message", () => {
    const issues = [
      validateSelection([]),
      validateSelection([file("set.mp4", 0)]),
      validateSelection([file("set.webm")]),
      validateSelection([file("set.mp4", 104_857_601)]),
    ];
    for (const issue of issues) {
      expect(issue?.message).toEqual(expect.any(String));
      expect(issue?.message.length).toBeGreaterThan(0);
    }
  });
});
