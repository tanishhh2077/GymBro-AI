import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import type { FirstRunIntroState } from '@/components/useFirstRunIntro';

const STEPS = [
  {
    title: 'Log workouts and routines',
    body: [
      'Record the weight and reps of each set while you train. Finished workouts appear in your history.',
      'Save a routine to start the same exercises again, with optional planned sets and reps kept apart from what you actually log.',
    ],
  },
  {
    title: 'Progress, records and optional backups',
    body: [
      'Progress shows charts and personal records calculated from the sets in your finished workouts.',
      'Workouts are saved on this device. Backup files and account sync are optional, and you can use the app as a guest.',
    ],
  },
  {
    title: 'Bench video analysis on this device',
    body: [
      'Choose a video of a barbell bench press filmed from the side view. Other exercises and camera angles are not analysed.',
      'The video is processed on this device and is never uploaded. You see estimates of body positions and elbow angles, not a verdict on your form.',
    ],
  },
] as const;

export function FirstRunIntro({ onClose }: { onClose: () => void }) {
  const id = useId();
  const [step, setStep] = useState(0);
  const dialog = useRef<HTMLDivElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  // Move focus to each step's heading so a screen reader announces the new content.
  useEffect(() => { heading.current?.focus(); }, [step]);
  const last = step === STEPS.length - 1;
  const current = STEPS[step];
  function keyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') { event.preventDefault(); onClose(); return; }
    if (event.key !== 'Tab') return;
    // aria-modal alone does not stop Tab from reaching the page behind the intro.
    const buttons = [...dialog.current!.querySelectorAll('button')];
    const first = buttons[0];
    const end = buttons[buttons.length - 1];
    if (event.shiftKey && (document.activeElement === first || document.activeElement === heading.current)) {
      event.preventDefault(); end.focus();
    } else if (!event.shiftKey && document.activeElement === end) {
      event.preventDefault(); first.focus();
    }
  }
  return <div className="fixed inset-0 z-40 flex items-end justify-center bg-ink-950/80 p-4 backdrop-blur-sm sm:items-center">
    <div ref={dialog} role="dialog" aria-modal="true" aria-labelledby={`${id}-title`} aria-describedby={`${id}-body`}
      onKeyDown={keyDown} className="card w-full max-w-md space-y-4 p-5">
      <div className="flex items-center justify-between gap-3 text-xs">
        <p id={`${id}-title`} className="font-semibold uppercase tracking-wide text-accent">Welcome to GymBro AI</p>
        <p className="text-slate-400">Step {step + 1} of {STEPS.length}</p>
      </div>
      <h2 ref={heading} tabIndex={-1} className="text-xl font-bold text-white outline-none">{current.title}</h2>
      <div id={`${id}-body`} className="space-y-2 text-sm leading-relaxed text-slate-300">
        {current.body.map(text => <p key={text}>{text}</p>)}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
        <button type="button" className="btn-ghost" onClick={onClose}>Skip intro</button>
        <div className="flex gap-2">
          {step > 0 && <button type="button" className="btn-ghost" onClick={() => setStep(step - 1)}>Back</button>}
          {last
            ? <button type="button" className="btn-primary" onClick={onClose}>Get started</button>
            : <button type="button" className="btn-primary" onClick={() => setStep(step + 1)}>Next</button>}
        </div>
      </div>
    </div>
  </div>;
}

export function ShowIntroAgain({ intro }: { intro: FirstRunIntroState }) {
  return <div className="space-y-1">
    <button type="button" className="btn-ghost" onClick={intro.show}>Show intro again</button>
    {intro.notice && <p role="status" className="text-xs text-slate-500">{intro.notice}</p>}
  </div>;
}
