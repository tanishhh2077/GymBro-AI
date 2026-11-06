import { useEffect, useId, useRef, useState } from "react";
import { validateSelection, type SelectionIssue } from "@/core/clipPolicy";
import { M1_LIMITS } from "@/core/processingLimits";
import { AlertIcon, UploadIcon } from "./icons";

interface ClipDropzoneProps {
  /** Receives one pre-checked file; returns the session's rejection, if any. */
  onSelect: (file: File) => SelectionIssue | null;
  /** True while a clip is loaded or being released; blocks every input path. */
  disabled?: boolean;
  /** Why admission is blocked, shown while `disabled`. */
  disabledMessage?: string;
}

const ACCEPT = ".mp4,video/mp4";
const MAX_MIB = M1_LIMITS.maxFileBytes / 1_048_576;

export function ClipDropzone({
  onSelect,
  disabled = false,
  disabledMessage = "Remove the current clip to choose another",
}: ClipDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [issue, setIssue] = useState<SelectionIssue | null>(null);
  const alertTitleId = useId();

  // A file dropped anywhere else on the page would be opened by the browser,
  // unloading the app and its in-memory result.
  useEffect(() => {
    const claimFileDrag = (e: DragEvent) => {
      if (Array.from(e.dataTransfer?.types ?? []).includes("Files")) e.preventDefault();
    };
    window.addEventListener("dragover", claimFileDrag);
    window.addEventListener("drop", claimFileDrag);
    return () => {
      window.removeEventListener("dragover", claimFileDrag);
      window.removeEventListener("drop", claimFileDrag);
    };
  }, []);

  // The same gate the store applies; it also sees multiple-file drops, which
  // the store never receives because it is handed a single file.
  const handleFiles = (files: ArrayLike<File> | null) => {
    if (disabled || !files) return;
    const list = Array.from(files);
    setIssue(validateSelection(list) ?? onSelect(list[0]));
  };

  return (
    <div className="space-y-2">
      <div
        role="group"
        aria-label="Video drop area"
        onDragOver={(e) => {
          // Always claim the drop so the browser never opens the file itself.
          e.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
        className={`flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-colors ${
          disabled
            ? "border-white/5 bg-ink-900/30 opacity-60"
            : dragging
              ? "border-accent/60 bg-accent/10"
              : "border-white/10 bg-ink-900/50"
        }`}
      >
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/15 text-accent">
          <UploadIcon width={28} height={28} />
        </span>
        <div>
          <div className="text-sm font-semibold text-white">
            {disabled ? disabledMessage : "Drop an MP4 video here"}
          </div>
          <div className="mt-1 text-xs text-slate-400">
            One .mp4 file, up to {MAX_MIB} MiB and {M1_LIMITS.maxDurationSeconds} seconds ·
            processed on this device
          </div>
        </div>
        <button
          type="button"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-on-accent transition-opacity focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          Choose video
        </button>
        {/* Reached only through the button above, which is the keyboard path. */}
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          disabled={disabled}
          tabIndex={-1}
          aria-hidden="true"
          className="hidden"
          onChange={(e) => {
            handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {issue && (
        <div
          role="alert"
          aria-labelledby={alertTitleId}
          className="flex items-start gap-2 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-left text-sm"
        >
          <AlertIcon width={18} className="mt-0.5 shrink-0 text-danger" aria-hidden="true" />
          <div>
            <strong id={alertTitleId} className="font-semibold text-danger">
              Video not accepted
            </strong>{" "}
            <span className="text-slate-300">{issue.message}</span>
          </div>
        </div>
      )}
    </div>
  );
}
