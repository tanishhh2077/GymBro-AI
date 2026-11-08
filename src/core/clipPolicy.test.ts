import { describe, expect, it } from "vitest";
import { validateSelection, type FileInfo } from "./clipPolicy";
import { M1_LIMITS } from "./processingLimits";

// Lightweight descriptions stand in for File objects, so no 100 MiB allocation.
function file(name: string, size = 1_000, type = "video/mp4"): FileInfo {
  return { name, size, type };
}

function fakeFileList(...files: FileInfo[]): FileList {
  return Object.assign(
    {
      length: files.length,
      item: (i: number) => (files[i] as File) ?? null,
      *[Symbol.iterator]() {
        yield* files as File[];
      },
    },
    files,
  ) as unknown as FileList;
}

describe("validateSelection", () => {
  it("accepts exactly one non-empty MP4 within the size limit", () => {
    expect(validateSelection([file("bench-set.mp4")])).toBeNull();
  });

  describe("file count boundaries", () => {
    it("rejects an empty selection array", () => {
      expect(validateSelection([])).toEqual({
        code: "file-count",
        message: "Choose one video file.",
      });
    });

    it("rejects an empty FileList", () => {
      const emptyFileList = fakeFileList();
      expect(validateSelection(emptyFileList as unknown as readonly FileInfo[])).toEqual({
        code: "file-count",
        message: "Choose one video file.",
      });
    });

    it("throws TypeError when passed null or undefined instead of an array-like list", () => {
      // validateSelection accesses files.length without a nullish guard.
      expect(() => validateSelection(null as unknown as readonly FileInfo[])).toThrow(TypeError);
      expect(() => validateSelection(undefined as unknown as readonly FileInfo[])).toThrow(TypeError);
    });

    it("rejects more than one file in an array instead of silently picking one", () => {
      expect(validateSelection([file("a.mp4"), file("b.mp4")])).toEqual({
        code: "file-count",
        message: "Choose only one video at a time.",
      });
      expect(validateSelection([file("a.mp4"), file("b.mp4"), file("c.mp4")])).toEqual({
        code: "file-count",
        message: "Choose only one video at a time.",
      });
    });

    it("rejects a FileList with several files", () => {
      const multiFileList = fakeFileList(
        file("set1.mp4"),
        file("set2.mp4"),
      );
      expect(validateSelection(multiFileList as unknown as readonly FileInfo[])).toEqual({
        code: "file-count",
        message: "Choose only one video at a time.",
      });
    });

    it("accepts a single-file FileList", () => {
      const singleFileList = fakeFileList(file("bench-press.mp4"));
      expect(validateSelection(singleFileList as unknown as readonly FileInfo[])).toBeNull();
    });
  });

  describe("file size boundaries", () => {
    it("rejects a zero-byte file", () => {
      expect(validateSelection([file("set.mp4", 0)])).toEqual({
        code: "empty",
        message: "This file is empty. Choose a recorded video.",
      });
    });

    it("rejects negative file sizes", () => {
      expect(validateSelection([file("set.mp4", -1)])).toEqual({
        code: "empty",
        message: "This file is empty. Choose a recorded video.",
      });
    });

    it("accepts a 1-byte file", () => {
      expect(validateSelection([file("set.mp4", 1)])).toBeNull();
    });

    it("accepts a file of exactly the 100 MiB limit (100 * 1024 * 1024 bytes)", () => {
      const limit = 100 * 1024 * 1024;
      expect(M1_LIMITS.maxFileBytes).toBe(limit);
      expect(validateSelection([file("set.mp4", limit)])).toBeNull();
    });

    it("rejects a file of one byte over the 100 MiB limit (100 * 1024 * 1024 + 1 bytes)", () => {
      const oneByteOver = 100 * 1024 * 1024 + 1;
      expect(validateSelection([file("set.mp4", oneByteOver)])).toEqual({
        code: "size",
        message: "This video is larger than 100 MiB. Choose a shorter or smaller clip.",
      });
    });

    it("accepts a file of one byte under the 100 MiB limit", () => {
      const oneByteUnder = 100 * 1024 * 1024 - 1;
      expect(validateSelection([file("set.mp4", oneByteUnder)])).toBeNull();
    });

    it("applies caller-supplied limits", () => {
      const limits = { ...M1_LIMITS, maxFileBytes: 10 };
      expect(validateSelection([file("set.mp4", 10)], limits)).toBeNull();
      expect(validateSelection([file("set.mp4", 11)], limits)).toMatchObject({ code: "size" });
    });

    it.each([NaN, 0, -1, Infinity])("throws for an invalid size limit %s instead of accepting any size", (maxFileBytes) => {
      expect(() => validateSelection([file("set.mp4")], { ...M1_LIMITS, maxFileBytes })).toThrow(RangeError);
    });
  });

  describe("filename extension boundaries", () => {
    it.each([
      "BENCH_PRESS.MP4",
      "SET.MP4",
      "CLIP.MP4",
      "set.MP4",
      "set.Mp4",
      "my.bench.set.mp4",
      "bench-press.mp4",
    ])("accepts MP4 extension case-insensitively: %s", (name) => {
      expect(validateSelection([file(name)])).toBeNull();
    });

    it.each([
      "SET.MOV",
      "CLIP.WEBM",
      "VIDEO.MKV",
      "set.webm",
      "set.mov",
      "set.mkv",
      "set",
      "set.mp4.exe",
    ])("rejects non-MP4 filenames including uppercase extensions: %j", (name) => {
      expect(validateSelection([file(name)])).toEqual({
        code: "format",
        message: "Choose an .mp4 video. Other formats are not supported yet.",
      });
    });
  });

  describe("MIME type independence", () => {
    it.each([
      "image/jpeg",
      "application/octet-stream",
      "text/plain",
      "video/quicktime",
      "",
    ])("accepts an MP4 filename even with a wrong or generic MIME type: %j", (type) => {
      expect(validateSelection([file("video.mp4", 1_000, type)])).toBeNull();
    });

    it.each([
      "video.txt",
      "video.jpg",
      "video",
      "video.mp4.txt",
      "video.mov",
      "video.webm",
    ])("rejects non-MP4 filenames even when MIME type claims video/mp4: %j", (name) => {
      expect(validateSelection([file(name, 1_000, "video/mp4")])).toEqual({
        code: "format",
        message: "Choose an .mp4 video. Other formats are not supported yet.",
      });
    });
  });

  it("gives every rejection a readable message", () => {
    const issues = [
      validateSelection([]),
      validateSelection([file("set.mp4", 0)]),
      validateSelection([file("set.webm")]),
      validateSelection([file("set.mp4", 100 * 1024 * 1024 + 1)]),
    ];
    for (const issue of issues) {
      expect(issue?.message).toEqual(expect.any(String));
      expect(issue?.message.length).toBeGreaterThan(0);
    }
  });
});
