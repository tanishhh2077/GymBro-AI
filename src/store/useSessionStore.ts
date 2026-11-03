import { create } from "zustand";
import type {
  CameraAngle,
  Clip,
  ClipSource,
  Exercise,
  PoseProgress,
} from "@/types";
import { getPoseEngine, PoseEngineError } from "@/core/PoseEngine";

let idCounter = 0;
const nextId = (prefix: string) => `${prefix}_${Date.now()}_${idCounter++}`;

interface SessionState {
  exercise: Exercise | null;
  clips: Clip[];
  /** Delegate the engine settled on, surfaced in the UI. */
  engineDelegate: string | null;

  setExercise: (exercise: Exercise) => void;
  addClip: (input: {
    file?: File;
    blob?: Blob;
    name: string;
    source: ClipSource;
    angle: CameraAngle;
  }) => string;
  setClipAngle: (id: string, angle: CameraAngle) => void;
  removeClip: (id: string) => void;
  processClip: (id: string) => Promise<void>;
  reset: () => void;
}

export const useSessionStore = create<SessionState>((set, get) => ({
  exercise: null,
  clips: [],
  engineDelegate: null,

  setExercise: (exercise) => set({ exercise }),

  addClip: ({ file, blob, name, source, angle }) => {
    const media = file ?? blob;
    if (!media) throw new Error("addClip requires a file or blob");
    const id = nextId("clip");
    const url = URL.createObjectURL(media);
    const clip: Clip = {
      id,
      name,
      source,
      angle,
      url,
      status: "pending",
    };
    set((s) => ({ clips: [...s.clips, clip] }));
    return id;
  },

  setClipAngle: (id, angle) =>
    set((s) => ({
      clips: s.clips.map((c) => (c.id === id ? { ...c, angle } : c)),
    })),

  removeClip: (id) =>
    set((s) => {
      const clip = s.clips.find((c) => c.id === id);
      if (clip) URL.revokeObjectURL(clip.url);
      return { clips: s.clips.filter((c) => c.id !== id) };
    }),

  processClip: async (id) => {
    const clip = get().clips.find((c) => c.id === id);
    if (!clip) return;

    const patch = (p: Partial<Clip>) =>
      set((s) => ({
        clips: s.clips.map((c) => (c.id === id ? { ...c, ...p } : c)),
      }));

    patch({ status: "processing", error: undefined, progress: undefined });

    const video = document.createElement("video");
    video.preload = "auto";
    video.muted = true;
    video.playsInline = true;
    video.crossOrigin = "anonymous";
    video.src = clip.url;

    try {
      await waitForMetadata(video);

      const engine = getPoseEngine();
      const onProgress = (progress: PoseProgress) => patch({ progress });

      const pose = await engine.processVideo(video, { onProgress });
      set({ engineDelegate: pose.delegate });

      if (pose.coverage.framesWithPose === 0) {
        patch({
          status: "error",
          error:
            "No pose was detected in this clip. Make sure the full body is in frame and well lit.",
          pose,
        });
        return;
      }

      patch({ status: "ready", pose });
    } catch (err) {
      const message =
        err instanceof PoseEngineError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Unknown error while processing the clip.";
      patch({ status: "error", error: message });
    } finally {
      video.removeAttribute("src");
      video.load();
    }
  },

  reset: () =>
    set((s) => {
      for (const c of s.clips) URL.revokeObjectURL(c.url);
      return { clips: [], exercise: null };
    }),
}));

function waitForMetadata(video: HTMLVideoElement): Promise<void> {
  return new Promise((resolve, reject) => {
    if (video.readyState >= 1 && video.videoWidth > 0) {
      resolve();
      return;
    }
    const onLoaded = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(
        new PoseEngineError(
          "The video could not be loaded. It may be corrupt or an unsupported format.",
          "video-load",
        ),
      );
    };
    const cleanup = () => {
      video.removeEventListener("loadedmetadata", onLoaded);
      video.removeEventListener("error", onError);
    };
    video.addEventListener("loadedmetadata", onLoaded);
    video.addEventListener("error", onError);
    window.setTimeout(() => {
      if (video.videoWidth > 0) {
        cleanup();
        resolve();
      }
    }, 5000);
  });
}
