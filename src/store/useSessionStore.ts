import { create } from "zustand";
import type { Clip, PoseDelegate } from "@/types";
import { PoseEngine, PoseEngineError } from "@/core/PoseEngine";
import { validateSelection, type SelectionIssue } from "@/core/clipPolicy";

let idCounter = 0;
const nextId = (prefix: string) => `${prefix}_${Date.now()}_${idCounter++}`;

/**
 * `processing`: a job owns the current clip. `cancelling`: a removed clip's job
 * or media is still being released, so no new clip is admitted. `idle`: free.
 */
export type ProcessingState = "idle" | "processing" | "cancelling";

/** The engine operations the store uses; tests may supply a controlled fake. */
export type SessionEngine = Pick<PoseEngine, "processVideo" | "close">;

/** Browser services the store depends on, replaceable in tests. */
export interface SessionDeps {
  createEngine: () => SessionEngine;
  createVideo: () => HTMLVideoElement;
  createObjectURL: (media: Blob) => string;
  revokeObjectURL: (url: string) => void;
}

interface SessionState {
  /** The only supported lift in this milestone. */
  exercise: "bench";
  /** At most one clip. */
  clips: Clip[];
  processingState: ProcessingState;
  /** Delegate (GPU or CPU) the current clip's completed job ran on; null otherwise. */
  engineDelegate: PoseDelegate | null;

  /** Admit one file or explain why not; processing continues in the background. */
  startClip: (file: File) => SelectionIssue | null;
  removeClip: (id: string) => void;
  reset: () => void;
  /** Hold the clip's URL open for a visible player; call the result to release. */
  retainClipMedia: (id: string) => () => void;
}

/** One object URL and the consumers still using it. */
interface MediaEntry {
  url: string;
  /** The hidden decoder's lease plus one per mounted player. */
  leases: number;
  /** Removed from the session; revoke once the last lease is released. */
  retired: boolean;
}

/** One admitted processing job. The object itself is the ownership token. */
interface Job {
  clipId: string;
  controller: AbortController;
  engine: SessionEngine;
}

const defaultDeps: SessionDeps = {
  createEngine: () => new PoseEngine(),
  createVideo: () => document.createElement("video"),
  createObjectURL: (media) => URL.createObjectURL(media),
  revokeObjectURL: (url) => URL.revokeObjectURL(url),
};

/**
 * Create an independent session store. The app uses the single `useSessionStore`
 * below; tests create their own so ownership state never leaks between them.
 *
 * Each admitted clip gets a fresh engine, `AbortController`, and job object.
 * Every state update from a job first checks that the job still owns the
 * session, because cancellation cannot stop a synchronous detection call or an
 * SDK promise that settles late. An object URL is revoked only after the clip
 * is removed and both the hidden decoder and every visible player released it.
 */
export function createSessionStore(overrides: Partial<SessionDeps> = {}) {
  const deps: SessionDeps = { ...defaultDeps, ...overrides };
  // Ownership bookkeeping is never rendered, so it stays outside reactive state.
  const media = new Map<string, MediaEntry>();
  let job: Job | null = null;

  return create<SessionState>((set, get) => {
    const refreshState = () => {
      let next: ProcessingState = "idle";
      if (job && !job.controller.signal.aborted) next = "processing";
      else if (job || [...media.values()].some((entry) => entry.retired)) next = "cancelling";
      if (get().processingState !== next) set({ processingState: next });
    };

    const revokeIfUnused = (id: string, entry: MediaEntry) => {
      if (!entry.retired || entry.leases > 0) return;
      media.delete(id);
      deps.revokeObjectURL(entry.url);
      refreshState();
    };

    const releaseLease = (id: string) => {
      const entry = media.get(id);
      if (!entry) return;
      entry.leases--;
      revokeIfUnused(id, entry);
    };

    const retire = (id: string) => {
      const entry = media.get(id);
      if (!entry || entry.retired) return;
      entry.retired = true;
      if (job?.clipId === id) job.controller.abort();
      revokeIfUnused(id, entry);
    };

    const runJob = async (current: Job, url: string) => {
      const { clipId, controller, engine } = current;
      const owns = () => job === current && !controller.signal.aborted;
      const patch = (update: Partial<Clip>) => {
        if (!owns()) return;
        set((s) => ({
          clips: s.clips.map((c) => (c.id === clipId ? { ...c, ...update } : c)),
        }));
      };

      let video: HTMLVideoElement | null = null;
      try {
        video = deps.createVideo();
        video.preload = "auto";
        video.muted = true;
        video.playsInline = true;
        video.crossOrigin = "anonymous";
        video.src = url;

        const pose = await engine.processVideo(video, {
          signal: controller.signal,
          onProgress: (progress) => patch({ progress }),
        });
        if (!owns()) return;
        set({ engineDelegate: pose.delegate });
        patch({
          status: pose.coverage.framesWithPose === 0 ? "no-pose" : "ready",
          pose,
          progress: undefined,
        });
      } catch (err) {
        patch({
          status: "error",
          error: err instanceof Error ? err.message : "Unknown error while processing the clip.",
          errorKind: err instanceof PoseEngineError ? err.kind : undefined,
          progress: undefined,
        });
      } finally {
        engine.close();
        // Detach the hidden decoder before giving up its lease on the URL.
        if (video) {
          video.removeAttribute("src");
          video.load();
        }
        if (job === current) job = null;
        releaseLease(clipId);
        refreshState();
      }
    };

    return {
      exercise: "bench",
      clips: [],
      processingState: "idle",
      engineDelegate: null,

      startClip: (file) => {
        const { clips, processingState } = get();
        if (clips.length > 0) {
          return { code: "busy", message: "Remove the current clip before choosing another." };
        }
        if (processingState !== "idle") {
          return {
            code: "busy",
            message: "The previous clip is still being released. Try again in a moment.",
          };
        }
        const issue = validateSelection([file]);
        if (issue) return issue;

        // Create the engine before the URL, so a failure here cannot strand a URL.
        const engine = deps.createEngine();
        const id = nextId("clip");
        const url = deps.createObjectURL(file);
        media.set(id, { url, leases: 1, retired: false });
        const current: Job = { clipId: id, controller: new AbortController(), engine };
        job = current;
        set({
          clips: [{ id, name: file.name, source: "upload", angle: "side", url, status: "processing" }],
          engineDelegate: null,
        });
        refreshState();
        void runJob(current, url);
        return null;
      },

      removeClip: (id) => {
        if (!get().clips.some((c) => c.id === id)) return;
        // The session holds at most one clip, so its delegate goes with it.
        set((s) => ({ clips: s.clips.filter((c) => c.id !== id), engineDelegate: null }));
        retire(id);
        refreshState();
      },

      reset: () => {
        const ids = get().clips.map((c) => c.id);
        set({ clips: [], engineDelegate: null });
        for (const id of ids) retire(id);
        refreshState();
      },

      retainClipMedia: (id) => {
        const entry = media.get(id);
        if (!entry || entry.retired) return () => {};
        entry.leases++;
        let released = false;
        return () => {
          if (released) return;
          released = true;
          releaseLease(id);
        };
      },
    };
  });
}

export const useSessionStore = createSessionStore();
