import { useRef, useState } from "react";
import { motion } from "framer-motion";
import type { CameraAngle } from "@/types";
import { ANGLE_LIST } from "@/core/exercises";
import { UploadIcon } from "./icons";

interface ClipDropzoneProps {
  onAdd: (file: File, angle: CameraAngle) => void;
  defaultAngle?: CameraAngle;
}

const ACCEPT = "video/mp4,video/quicktime,video/webm,video/x-matroska,video/*";

export function ClipDropzone({
  onAdd,
  defaultAngle = "side",
}: ClipDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [angle, setAngle] = useState<CameraAngle>(defaultAngle);
  const [dragging, setDragging] = useState(false);

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = Array.from(files).find((f) => f.type.startsWith("video/"));
    if (file) onAdd(file, angle);
  };

  return (
    <div className="space-y-3">
      <div>
        <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
          Camera angle for this clip
        </div>
        <div className="flex flex-wrap gap-2">
          {ANGLE_LIST.map((a) => {
            const active = angle === a.id;
            return (
              <button
                key={a.id}
                type="button"
                onClick={() => setAngle(a.id)}
                className={`chip border px-3 py-1.5 text-xs transition-colors ${
                  active
                    ? "border-accent/50 bg-accent/15 text-accent-100"
                    : "border-white/5 bg-white/5 text-slate-300 hover:border-white/15"
                }`}
                title={a.description}
                aria-pressed={active}
              >
                {a.name}
              </button>
            );
          })}
        </div>
        <p className="mt-1.5 text-xs text-slate-500">
          {ANGLE_LIST.find((a) => a.id === angle)?.description}
        </p>
      </div>

      <motion.label
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
        whileHover={{ scale: 1.005 }}
        className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-colors ${
          dragging
            ? "border-accent/60 bg-accent/10"
            : "border-white/10 bg-ink-900/50 hover:border-white/20"
        }`}
      >
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/15 text-accent">
          <UploadIcon width={28} height={28} />
        </span>
        <div>
          <div className="text-sm font-semibold text-white">
            Drop a video here or click to upload
          </div>
          <div className="mt-1 text-xs text-slate-400">
            MP4, MOV, or WebM · processed entirely on your device
          </div>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          className="hidden"
          onChange={(e) => {
            handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </motion.label>
    </div>
  );
}
