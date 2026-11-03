import { AnimatePresence, motion } from "framer-motion";
import { useSessionStore } from "@/store/useSessionStore";
import { ANGLES, EXERCISES } from "@/core/exercises";
import { ClipDropzone } from "@/components/ClipDropzone";
import { VideoStage } from "@/components/VideoStage";
import { ShieldIcon, TrashIcon } from "@/components/icons";

export default function App() {
  const exercise = useSessionStore((s) => s.exercise);
  const clips = useSessionStore((s) => s.clips);
  const processingState = useSessionStore((s) => s.processingState);
  const startClip = useSessionStore((s) => s.startClip);
  const removeClip = useSessionStore((s) => s.removeClip);
  const retainClipMedia = useSessionStore((s) => s.retainClipMedia);

  // Only the names are shown; the legacy taglines/descriptions claim measurements
  // that are not implemented.
  const { name: exerciseName, accent } = EXERCISES[exercise];
  const admissionBlocked = clips.length > 0 || processingState !== "idle";

  return (
    <div className="relative min-h-full">
      <BackdropFX accent={accent} />
      <Header />

      <main className="mx-auto w-full max-w-5xl px-4 pb-24 pt-6 sm:px-6">
        <Hero />

        <Section
          step={1}
          title="Add your bench press video"
          subtitle="Film one set from the side, then choose the MP4 file."
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
          <RecordingGuide />
          <ClipDropzone onSelect={startClip} disabled={admissionBlocked} />
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
                subtitle="Estimated landmarks drawn over your video, synced to playback. Remove the clip to cancel or start over."
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
                          onClick={() => removeClip(clip.id)}
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
      </main>
    </div>
  );
}

function Header() {
  return (
    <header className="sticky top-0 z-30 border-b border-white/5 bg-ink-950/70 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
        <div className="flex items-center gap-2.5">
          <Logo />
          <div className="leading-none">
            <div className="text-sm font-extrabold tracking-tight text-white">
              GymBro AI
            </div>
            <div className="mt-0.5 text-[11px] text-slate-500">
              Your second set of eyes.
            </div>
          </div>
        </div>
        {/* Narrow claim: the video is processed locally; the page still loads web fonts. */}
        <span className="chip border border-white/5 bg-white/5 text-[11px] text-slate-300">
          <ShieldIcon width={13} className="text-accent" />
          <span className="hidden sm:inline">On-device processing</span>
          <span className="sm:hidden">On-device</span>
        </span>
      </div>
    </header>
  );
}

function Logo() {
  return (
    <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-accent/30 to-electric/20">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path
          d="M4 9v6M20 9v6M7 12h10M7 8v8M17 8v8"
          stroke="#4ade80"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
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
        <li>Film from the side with the camera steady, at about bench height.</li>
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
  children,
}: {
  step: number;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-10">
      <div className="mb-4 flex items-start gap-3">
        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 font-mono text-xs font-bold text-accent">
          {step}
        </span>
        <div>
          <h2 className="text-lg font-bold text-white">{title}</h2>
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
