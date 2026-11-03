import { motion } from "framer-motion";
import type { Exercise } from "@/types";
import { EXERCISE_LIST } from "@/core/exercises";
import { BenchIcon, DeadliftIcon, SquatIcon } from "./icons";

const ICONS: Record<Exercise, typeof SquatIcon> = {
  squat: SquatIcon,
  deadlift: DeadliftIcon,
  bench: BenchIcon,
};

interface ExercisePickerProps {
  value: Exercise | null;
  onChange: (exercise: Exercise) => void;
}

export function ExercisePicker({ value, onChange }: ExercisePickerProps) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {EXERCISE_LIST.map((meta, i) => {
        const Icon = ICONS[meta.id];
        const active = value === meta.id;
        return (
          <motion.button
            key={meta.id}
            type="button"
            onClick={() => onChange(meta.id)}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06, duration: 0.35 }}
            whileHover={{ y: -3 }}
            whileTap={{ scale: 0.98 }}
            className={`group relative overflow-hidden rounded-2xl border p-5 text-left transition-colors ${
              active
                ? "border-accent/50 bg-accent/10"
                : "border-white/5 bg-ink-850/60 hover:border-white/15"
            }`}
            aria-pressed={active}
          >
            <div
              className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full blur-2xl transition-opacity"
              style={{
                background: meta.accent,
                opacity: active ? 0.22 : 0.08,
              }}
            />
            <div className="flex items-center gap-3">
              <span
                className="flex h-11 w-11 items-center justify-center rounded-xl"
                style={{
                  background: `${meta.accent}1a`,
                  color: meta.accent,
                }}
              >
                <Icon width={26} height={26} />
              </span>
              <div>
                <div className="text-base font-bold text-white">
                  {meta.name}
                </div>
                <div className="text-xs text-slate-400">{meta.tagline}</div>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-1.5">
              {meta.focus.map((f) => (
                <span
                  key={f}
                  className="chip bg-white/5 text-[11px] text-slate-300"
                >
                  {f}
                </span>
              ))}
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}
