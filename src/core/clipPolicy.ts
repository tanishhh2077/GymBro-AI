import { M1_LIMITS, type ProcessingLimits } from "./processingLimits";

/** The parts of a `File` the selection check reads; tests pass plain objects. */
export type FileInfo = Pick<File, "name" | "size" | "type">;

/**
 * Why a selection cannot start processing. `busy` is reserved for the store,
 * which rejects a selection while another clip is processing or cleaning up.
 */
export interface SelectionIssue {
  code: "file-count" | "empty" | "format" | "size" | "busy";
  message: string;
}

const MP4_NAME = /\.mp4$/i;

/**
 * Admission check run before any URL, decoding, or model work. Accepts exactly
 * one non-empty file named `.mp4` (any letter case) within the size limit.
 *
 * The name and MIME type are only hints: browsers often report an empty or
 * generic type, and neither proves the codec. The MIME type is therefore never
 * a reason to accept or reject. Whether the video actually decodes, and its
 * duration and dimensions, are checked later by the pose engine.
 */
export function validateSelection(
  files: readonly FileInfo[],
  limits: Readonly<ProcessingLimits> = M1_LIMITS,
): SelectionIssue | null {
  const maxBytes = limits.maxFileBytes;
  // `size > NaN` is always false, so an invalid limit would accept any size.
  if (!Number.isFinite(maxBytes) || maxBytes <= 0) {
    throw new RangeError("maxFileBytes must be a positive finite number.");
  }

  if (files.length !== 1) {
    return {
      code: "file-count",
      message: files.length === 0
        ? "Choose one video file."
        : "Choose only one video at a time.",
    };
  }
  const [file] = files;
  if (file.size <= 0) {
    return { code: "empty", message: "This file is empty. Choose a recorded video." };
  }
  if (!MP4_NAME.test(file.name)) {
    return {
      code: "format",
      message: "Choose an .mp4 video. Other formats are not supported yet.",
    };
  }
  if (file.size > maxBytes) {
    return {
      code: "size",
      message: `This video is larger than ${formatBytes(maxBytes)}. Choose a shorter or smaller clip.`,
    };
  }
  return null;
}

function formatBytes(bytes: number): string {
  const mebibytes = bytes / 1_048_576;
  return mebibytes >= 1
    ? `${Number(mebibytes.toFixed(1))} MiB`
    : `${bytes} bytes`;
}
