import type { SetLink } from '@/types';
import { isBenchPressName, sameSetLink } from '@/core/setLinks';

/** What a set row needs from App to open or reopen analysis. */
export interface SetAnalysisActions {
  /** The link of the clip currently open in Analyze, if any. */
  openLink?: SetLink;
  onAnalyze: (link: SetLink) => void;
  onView: () => void;
}

/** Renders nothing for exercises other than flat barbell bench press. */
export function SetAnalysisButton({ link, exerciseName, setNumber, actions, disabled }: {
  link: SetLink; exerciseName: string; setNumber: number; actions?: SetAnalysisActions; disabled: boolean;
}) {
  if (!actions || !isBenchPressName(exerciseName)) return null;
  const open = actions.openLink !== undefined && sameSetLink(actions.openLink, link);
  const action = open ? 'View analysis' : 'Analyze video';
  return <button type="button" className="px-2 py-2 text-accent" disabled={disabled}
    aria-label={`${action} for set ${setNumber} of ${exerciseName}`}
    onClick={() => (open ? actions.onView() : actions.onAnalyze(link))}>{action}</button>;
}
