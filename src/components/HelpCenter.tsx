import { useId, useState } from 'react';

const TOPICS = [
  {
    title: 'Logging workouts and sets',
    paragraphs: [
      'Start a workout from Home, choose lb or kg, then add exercises and save each set with its reps and weight. Use 0 for no added load. Regular and Warm-up labels describe your manual entries; they are not analysis results.',
      'Only a successful save adds a set. Finish the workout to include it in History and Progress. Summary volume includes all logged sets; personal records use Regular sets from completed workouts. Exercise names and lb/kg groups remain separate.',
      'An unfinished workout can be resumed after reload when local storage is working. Check visible save errors before leaving. The rest timer is session-only: it resets on reload and completion appears in-app, without a background notification.',
    ],
  },
  {
    title: 'Routines and exercise choices',
    paragraphs: [
      'Routines are saved templates with ordered exercises and optional set, rep and weight targets. Starting a routine creates a fresh workout with no logged sets. Targets are plans, not completed work. Editing a routine does not rewrite workouts already started from it.',
      'Browse the exercise library or type your own name. Equipment filters apply to built-in catalog entries; custom names remain searchable because their equipment is unknown. Star an exercise to put it first among matching results. Favorites stay on this device and are not part of backup or account sync.',
      'Logging an exercise name does not mean video analysis supports that exercise. The current video workflow is limited to a side-view barbell bench press.',
    ],
  },
  {
    title: 'Backup and restore',
    paragraphs: [
      'Open Backup and restore from Home to export saved workouts, routines and the active workout as a JSON file. Keep a copy somewhere you control before clearing browser or app data. Browser export requests a download; the installed app opens the share sheet.',
      'Choose a backup file, review the preview, then confirm restore. Restore adds new records and skips identical records. Conflicting versions of the same record block restore; it does not silently overwrite them. If the library changes, make a fresh preview before confirming.',
      'Backups contain manual workout records, not videos, pose data, favorites or rest timer state. Physical-phone file flows still need verification.',
    ],
  },
  {
    title: 'Privacy, storage and optional accounts',
    paragraphs: [
      'Guest workout records are stored locally on this device. Clearing browser or app data can remove them. Each account has a separate local library; signing out does not erase its cached records. Copying guest records into an account is an explicit action.',
      'Optional email-code accounts and manual workout/routine sync require service setup. Sync sends manual records to the configured account service, never your videos. Review conflicts before confirming sync. Live email delivery and real cross-device sync remain unverified while setup is pending.',
      'Selecting a video gives the app local access; it does not upload the video to a server. Pose processing uses the on-device model and runtime. Analysis and links to logged sets last only for the session and are not saved in workout records.',
    ],
  },
  {
    title: 'Filming a bench press video',
    paragraphs: [
      'Choose one MP4 of one barbell bench press set filmed from the side. Keep the camera steady with even, adequate light. Keep your shoulders, elbows, and wrists in frame throughout the set.',
      'Keep the bar path visible so you can review it yourself; the app does not track the bar. Other people, including a spotter, can confuse the pose estimate. Body parts hidden from view may produce missing or incorrect landmarks.',
      'The current input limits are 100 MiB, 60 seconds, a maximum long edge of 1920 pixels and at most 2,073,600 pixels per frame. A file extension alone does not guarantee the device can decode the video.',
    ],
  },
  {
    title: 'Understanding video observations',
    paragraphs: [
      'The overlay shows estimated body landmarks at sampled video times. Elbow traces and lowest/highest angles describe 2D image-space observations, not validated technique, per-rep range of motion or ground-truth 3D biomechanics.',
      'Available sample counts are not confidence scores. Missing observations are shown as unavailable; extreme values can include tracking errors. The app does not count repetitions, give a form score or diagnose injuries. A clear overlay does not establish correct form.',
      'Processing time describes this run on this device, not a performance benchmark. Real-bench acceptance and physical-phone behavior remain unverified.',
    ],
  },
];

export function HelpCenter({ onClose }: { onClose: () => void }) {
  const searchId = useId();
  const [query, setQuery] = useState('');
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const matches = TOPICS.filter(topic => {
    const text = `${topic.title} ${topic.paragraphs.join(' ')}`.toLowerCase();
    return terms.every(term => text.includes(term));
  });
  return <section aria-label="Help center" className="mx-auto w-full max-w-3xl space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h1 className="font-display text-2xl font-bold text-white">Help</h1>
      <button type="button" className="btn-ghost" onClick={onClose}>Back to Home</button>
    </div>
    <p className="text-sm text-slate-400">Find guidance for logging, routines, backups, privacy and bench video observations.</p>
    <div>
      <label htmlFor={searchId} className="text-sm text-slate-300">Search help</label>
      <input id={searchId} type="search" maxLength={120} value={query} onChange={event => setQuery(event.target.value)}
        placeholder="Search a topic or question"
        className="mt-1 w-full rounded-lg border border-white/15 bg-ink-950 px-3 py-2 text-base text-white" />
      {query && <button type="button" className="btn-ghost mt-2" onClick={() => setQuery('')}>Clear search</button>}
    </div>
    <p role="status" className="text-sm text-slate-400">{matches.length ? `${matches.length} help topics` : 'No help topics match. Try fewer words or clear your search.'}</p>
    {matches.map(topic => <article key={topic.title} className="space-y-3 rounded-xl border border-white/10 bg-ink-900 p-4">
      <h2 className="text-lg font-semibold text-white">{topic.title}</h2>
      {topic.paragraphs.map(paragraph => <p key={paragraph} className="text-sm leading-relaxed text-slate-300">{paragraph}</p>)}
    </article>)}
  </section>;
}
