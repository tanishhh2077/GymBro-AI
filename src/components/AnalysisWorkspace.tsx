import { useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useSessionStore, type SessionStore } from "@/store/useSessionStore";
import { resolveSetLink, type ResolvedSet } from "@/core/setLinks";
import { emptyWorkoutData } from "@/core/workouts";
import type { SetLink } from "@/types";
import type { WorkoutData } from "@/types/workout";
import { ANGLES, EXERCISES } from "@/core/exercises";
import { ClipDropzone } from "@/components/ClipDropzone";
import { VideoStage } from "@/components/VideoStage";
import { TrashIcon } from "@/components/icons";

const SESSION_NOTE =
  "This video and its link last until you reload, close the app, or leave the app while it is still processing. They are not saved.";

/** Logged values are the user's entries, kept visibly apart from pose observations (D-002). */
function describeSet(prefix: string, found: ResolvedSet) {
  const { setNumber, exercise, set, workout } = found;
  return `${prefix} set ${setNumber} of ${exercise.name}: ${set.reps} reps × ${set.weight} ${workout.unit} (entered by you, not counted from the video), in ${workout.name}.`;
}

interface AnalysisWorkspaceProps {
  session?: SessionStore;
  /** Confirmed workout data used to describe links; never written from here. */
  data?: WorkoutData;
  /** False while workouts are not loaded or need a reload. */
  available?: boolean;
  /** A set chosen on a set row that the next admitted video will be linked to. */
  pendingLink?: SetLink;
  onClearPending?: () => void;
  onBackToSet?: (link: SetLink) => void;
}

export function AnalysisWorkspace({
  session = useSessionStore,
  data = emptyWorkoutData(),
  available = false,
  pendingLink,
  onClearPending,
  onBackToSet,
}: AnalysisWorkspaceProps = {}) {
  const exercise = session((s) => s.exercise);
  const clips = session((s) => s.clips);
  const processingState = session((s) => s.processingState);
  const startClip = session((s) => s.startClip);
  const removeClip = session((s) => s.removeClip);
  const retainClipMedia = session((s) => s.retainClipMedia);
  const [refusal, setRefusal] = useState("");
  // Resolved on every render, so a set deleted while it is pending shows at once.
  const pending = pendingLink ? resolveSetLink(data, pendingLink) : null;

  // The pending link is checked again at admission; admission is synchronous, so
  // the data cannot change between this check and the store creating the clip.
  const admit = (file: File) => {
    setRefusal("");
    if (!pendingLink) return startClip(file);
    if (!resolveSetLink(data, pendingLink)) {
      onClearPending?.();
      setRefusal("That set is no longer in your workouts, so the video was not opened. Choose a set again, or choose a video to analyze it without a link.");
      return null;
    }
    const issue = startClip(file, pendingLink);
    if (!issue) onClearPending?.();
    return issue;
  };

  const { name: exerciseName, accent } = EXERCISES[exercise];
  const admissionBlocked = clips.length > 0 || processingState !== "idle";
  const releasing = clips.length === 0 && processingState === "cancelling";
  const addHeadingRef = useRef<HTMLHeadingElement>(null);

  // The removed clip's section unmounts after its exit animation, taking the
  // focused remove button with it; move keyboard focus somewhere that remains.
  const handleRemove = (id: string) => {
    removeClip(id);
    addHeadingRef.current?.focus();
  };

  return (
    <div className="relative min-h-full">
      <BackdropFX accent={accent} />

      <div className="space-y-6">
        <Hero />

        <Section
          step={1}
          title="Add your bench press video"
          subtitle="Film one set from the side, then choose the MP4 file."
          headingRef={addHeadingRef}
        >
          <div className="mb-3 flex flex-wrap gap-2">
            <span
              className="chip text-xs font-semibold"
              style={{ background: `${accent}1f`, color: accent }}
            >
              {exerciseName}
            </span>
            <span
              className="chip text-xs font-semibold"
              style={{ background: `${accent}1f`, color: accent }}
            >
              {ANGLES.side.name} view
            </span>
          </div>
          {pendingLink && (pending ? (
            <div role="status" className="mb-4 rounded-xl border border-accent/30 bg-accent/10 px-4 py-3 text-sm text-slate-200">
              <p>{describeSet("For your logged", pending)}</p>
              {clips.length > 0 && <p className="mt-2 text-warn">Remove the open video to analyze set {pending.setNumber} of {pending.exercise.name}.</p>}
              <button type="button" className="mt-2 underline underline-offset-4" onClick={onClearPending}>Analyze without linking</button>
            </div>
          ) : (
            <div role="alert" className="mb-4 rounded-xl border border-warn/30 bg-warn/10 px-4 py-3 text-sm text-warn">
              <p>That set is no longer in your workouts. Choose a set again, or analyze without linking.</p>
              <button type="button" className="mt-2 underline underline-offset-4" onClick={onClearPending}>Analyze without linking</button>
            </div>
          ))}
          {refusal && <div role="alert" className="mb-4 rounded-xl border border-warn/30 bg-warn/10 px-4 py-3 text-sm text-warn">{refusal}</div>}
          {(pendingLink || clips.some((c) => c.link)) && <p className="mb-4 text-xs text-slate-500">{SESSION_NOTE}</p>}
          <RecordingGuide />
          <ClipDropzone
            onSelect={admit}
            disabled={admissionBlocked}
            disabledMessage={releasing ? "Releasing the previous clip…" : undefined}
          />
        </Section>

        <AnimatePresence>
          {clips.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <Section
                step={2}
                title="Pose overlay"
                subtitle="Estimated landmarks drawn over your video during playback. Remove the clip to cancel or start over."
              >
                <div className="space-y-6">
                  {clips.map((clip) => (
                    <motion.div
                      key={clip.id}
                      layout
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span
                            className="chip text-xs font-semibold"
                            style={{
                              background: `${accent}1f`,
                              color: accent,
                            }}
                          >
                            {exerciseName} · {ANGLES[clip.angle].name} view
                          </span>
                          <span className="max-w-[40vw] truncate text-xs text-slate-500">
                            {clip.name}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemove(clip.id)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-slate-400 transition-colors hover:bg-danger/15 hover:text-danger"
                          aria-label={
                            clip.status === "processing"
                              ? "Cancel processing and remove clip"
                              : "Remove clip"
                          }
                        >
                          <TrashIcon width={16} />
                        </button>
                      </div>
                      <ClipLink clip={clip} data={data} available={available} onBackToSet={onBackToSet} />
                      <VideoStage
                        clip={clip}
                        accent={accent}
                        retainMedia={retainClipMedia}
                      />
                    </motion.div>
                  ))}
                </div>
              </Section>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function ClipLink({ clip, data, available, onBackToSet }: {
  clip: { link?: SetLink; linkRemoved?: true };
  data: WorkoutData;
  available: boolean;
  onBackToSet?: (link: SetLink) => void;
}) {
  if (clip.linkRemoved) {
    return <p role="status" className="mb-3 text-sm text-warn">The linked set was removed from your workouts, so this video is no longer linked.</p>;
  }
  const found = clip.link ? resolveSetLink(data, clip.link) : null;
  if (!clip.link || !found) return null;
  const link = clip.link;
  return (
    <div className="mb-3 flex flex-wrap items-center gap-3 text-sm text-slate-300">
      <p className="min-w-0 flex-1">{describeSet("Linked to your logged", found)}</p>
      <button type="button" className="btn-ghost" disabled={!available} onClick={() => onBackToSet?.(link)}>Back to set</button>
    </div>
  );
}

function Hero() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="mb-8 mt-2"
    >
      <h1 className="text-3xl font-extrabold leading-tight tracking-tight text-white sm:text-5xl">
        See your bench press pose,
        <br />
        <span className="text-gradient">sample by sample.</span>
      </h1>
      <p className="mt-3 max-w-xl text-sm text-slate-400 sm:text-base">
        Choose a side-view video of one barbell bench press set. GymBro AI
        estimates body landmarks in sampled frames and draws them over playback.
        It does not count reps, track the bar, or judge your technique. The video
        is processed on this device and is not uploaded.
      </p>
    </motion.div>
  );
}

function RecordingGuide() {
  return (
    <div className="mb-4 rounded-xl border border-white/5 bg-white/[0.03] px-4 py-3 text-sm text-slate-300">
      <div className="mb-1.5 font-semibold text-white">For the clearest overlay</div>
      <ul className="list-disc space-y-1 pl-5 text-slate-400">
        <li>Film from the side with the camera steady.</li>
        <li>Keep your shoulders, elbows, and wrists in frame for the whole set.</li>
        <li>
          Keep the bar&apos;s path in frame so you can review it yourself; GymBro AI
          does not track the bar.
        </li>
        <li>
          Have only one lifter in view where possible; other people, such as a
          spotter, can confuse the pose estimate.
        </li>
        <li>Use even, adequate light.</li>
      </ul>
      <p className="mt-2 text-xs text-slate-500">
        Landmarks are estimates. They can be missing or wrong where body parts are
        hidden, and a clear overlay is not a judgment of your form.
      </p>
    </div>
  );
}

function Section({
  step,
  title,
  subtitle,
  headingRef,
  children,
}: {
  step: number;
  title: string;
  subtitle: string;
  /** Lets the page move keyboard focus to this heading. */
  headingRef?: React.Ref<HTMLHeadingElement>;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-10">
      <div className="mb-4 flex items-start gap-3">
        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 font-mono text-xs font-bold text-accent">
          {step}
        </span>
        <div>
          <h2
            ref={headingRef}
            tabIndex={headingRef ? -1 : undefined}
            className="text-lg font-bold text-white focus:outline-none"
          >
            {title}
          </h2>
          <p className="text-sm text-slate-400">{subtitle}</p>
        </div>
      </div>
      <div className="pl-0 sm:pl-10">{children}</div>
    </section>
  );
}

function BackdropFX({ accent }: { accent: string }) {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-grid [background-size:44px_44px] opacity-[0.4]" />
      <motion.div
        animate={{ opacity: [0.25, 0.4, 0.25] }}
        transition={{ duration: 8, repeat: Infinity }}
        className="absolute -left-32 -top-32 h-96 w-96 rounded-full blur-3xl"
        style={{ background: `${accent}22` }}
      />
      <div className="absolute -right-40 top-1/3 h-96 w-96 rounded-full bg-electric/10 blur-3xl" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-ink-950" />
    </div>
  );
}
