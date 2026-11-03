# Task 4 fixture search record

Researched by Codex on 2026-11-03; served model ID unavailable. This records
candidate inspection, not model performance. No fixture has been accepted.
The user cannot arrange a recording and explicitly requested continued searching.
Do not ask them to record again or broaden the approved exercise/view silently.

## Acceptance gate

Find actual flat barbell bench press from a stable side view, with the intended
lifter's shoulders, elbows, wrists, and bar movement visible. Establish source
permission for local development testing. Then inspect exact reference times,
probe metadata, and hash the accepted H.264 MP4 according to the active plan.
Do not equate a stock site's view tag, a preview, or a dataset code license with
fixture suitability or permission. No anatomical or inference result exists yet.

## Sampled frames from downloaded candidate videos

All files and stills are in ignored `.superpowers/fixture-candidates/`, outside
the served app and Git. Frame contact sheets scout content; they are not accepted
reference timestamps or proof that every intervening frame was inspected.

| Source | Inspection and disposition |
| --- | --- |
| [wger exercise 73 videos](https://wger.de/api/v2/video/?exercise=73), IDs 21, 22, 23; author Goulart | Downloaded all three. Inspected exact 1, 8, and 14 second stills from each. ID 21 is handheld oblique/foot-end; ID 22 starts on the floor and settles at an oblique foot-end view; ID 23 moves from the floor to a close overhead view. None accepted. |
| [DVIDS 639911: Barbell Bench Press](https://www.dvidshub.net/video/639911/barbell-bench-press), Matthew Holfinger | Sampled every 2 seconds. Split front/oblique foot-end views, no suitable side segment. |
| [DVIDS 987011: Sembach competition](https://www.dvidshub.net/video/987011/afn-tv-focus-sembach-bench-press-competition), Novah Nzeyimana | Sampled every 5 seconds. News cuts/interviews and obstructed oblique/end-on lifts. No accepted segment. |
| [DVIDS 894563: Aviano powerlifter](https://www.dvidshub.net/video/894563/avianos-record-breaker-powerlifter), Elijah Dority | Sampled every 5 seconds. Interviews, extreme low views, overhead and foot-end competition shots. No accepted segment. |
| [DVIDS 112993: Championship B-roll](https://www.dvidshub.net/video/112993/b-roll-bench-press-championship), Vanessa Davila | Obtained the published player HLS stream, remuxed to local MP4 without audio. Sampled every 5 seconds. Many cuts, oblique shots, close-ups, and multiple people; no accepted stable side-view segment. |
| [DVIDS 583253: Iwakuni competition B-roll](https://www.dvidshub.net/video/583253/marine-corps-air-station-iwakuni-japanese-service-members-push-limits-bench-press-competition-b-roll), Katie Campbell (page credit) | Downloaded the published player MP4. Sampled every 4 seconds. End-on/overhead shots, plates/face/hand close-ups, spotters, and cuts. No accepted segment. The video slate credits Katie Curtis; preserve this discrepancy if revisiting attribution. |
| [Pexels 20672105 download](https://www.pexels.com/download/video/20672105/) | Downloaded the publicly linked 1080p MP4. Sampled every 3 seconds. Actual barbell bench press, but the camera travels from oblique toward the foot end and changes framing. Rejected for the standardized side-view fixture. |

Permission sources: wger's [license ID 2](https://wger.de/api/v2/license/2/)
identifies CC BY-SA 4.0 for those records. The inspected DVIDS source pages mark
their works public domain, subject to the [DVIDS copyright policy](https://www.dvidshub.net/about/copyright).
Any reuse must preserve appropriate credit and avoid implied endorsement; do not
treat identifiable people as endorsing GymBro AI. [Pexels terms](https://www.pexels.com/terms-of-service/)
permit specified uses but restrict standalone unaltered distribution. Keep any
future Pexels fixture outside Git unless its exact redistribution rights allow it.
These are candidate permissions, not an accepted fixture license determination.

## Additional previews inspected and rejected

The seven previews from the earlier search remain documented in
[STATUS.md](STATUS.md#task-4-fixture-investigation-step-1-incomplete).
Additional downloaded previews were visually inspected, without claiming the
entire corresponding video was watched:

| Candidate IDs / source | Preview finding |
| --- | --- |
| Pexels 5320001, 5320004 (Tima Miroshnichenko) | Tight plate/hand/face views; the needed arm chain is obscured or cropped. |
| Pexels 32239226 (Igor Vieira) | Barbell bench press, but oblique from the foot end. |
| Pexels 27237071 | Seated machine press, wrong exercise. |
| Pexels 5319998, 5320007, 5320012 | Weight-changing close-up, overhead view, and seated setup respectively; no suitable view in the preview. |
| Pexels 4746007, 5319746, 5319747 | Wrong movement/content: low standing bar view, standing torso crop, cable machine. |
| [Mixkit 100543](https://mixkit.co/free-stock-video/man-doing-bench-press-at-the-gym-100543/), [100544](https://mixkit.co/free-stock-video/man-lifting-weights-in-the-gym-100544/), [100545](https://mixkit.co/free-stock-video/man-in-a-weightlifting-session-100545/) | Oblique/inclined-looking view, low end-on view, and tight face/shoulder crop respectively. No full clip downloaded. |

Pexels 4367541, 4920809, and 4920816 generic thumbnail requests returned 404;
these were **not** visually inspected. Related links 4920810 and 4920808 also
remain uninspected. Do not count inaccessible previews as rejected footage.

## Research and access leads

- The [2026 Coach's Eye study](https://link.springer.com/article/10.1186/s40798-026-01003-2)
  describes side-view bench recordings. Its public [OSF project yt6wa](https://osf.io/yt6wa/)
  exposes a CSV, R script, and supplementary DOCX, with no child nodes returned;
  no video files were listed. The [2025 study](https://link.springer.com/article/10.1186/s40798-025-00890-1)
  links [OSF ha8ke](https://osf.io/ha8ke/), whose root storage lists CSV/Rmd,
  two images, and a manuscript, with no recordings. Both OSF node metadata
  responses had `node_license: null`. The 2026 article's linked instructional
  YouTube video `RvZC-K8qLXU` was not downloaded; the article's CC BY license
  alone does not establish the external video's license.
- [Commons power-rack video](https://commons.wikimedia.org/wiki/File:Using_a_Power_Rack_in_bodybuilding,_powerlifting,_strength_training,_resistance_exercise.webm),
  FitnessScape, CC BY 3.0: API metadata reports 224.3 seconds, 1280x720 WebM.
  Two ordinary source download attempts, separated by a cooldown, returned 429.
  No video was obtained or inspected; no rate-limit bypass attempted. Still a
  lead when ordinary access becomes available. Earlier Commons candidates are
  recorded in STATUS; the full half-rack video remains content-uninspected.
- [buzops9/exercisedb README](https://github.com/buzops9/exercisedb): fetched
  through the GitHub connector. Despite an MIT software license, the author
  says the videos were purchased from an Instagram advertisement and their
  original provenance is unknown. Rejected as video permission evidence; no
  full video downloaded or repository code executed.
- [RepCount's original project](https://svip-lab.github.io/dataset/RepCount_dataset)
  says Part A was collected from YouTube. No individual source-video reuse
  permission was established. Do not infer public-domain status from public
  accessibility or another paper's description. No dataset downloaded.
- [MM-Fit](https://mmfit.github.io/) does not include bench press in its listed
  exercise set; no multi-gigabyte dataset downloaded.
- Internet Archive search results had no usable license evidence for the
  relevant bench entries. Navy's public movement-library page was inspected,
  but supplied no verified barbell bench candidate. Neither source was accepted.
- Pixabay's matching search largely returned unrelated park benches; the
  `freefitnessmedia` result is leg press, not bench press. A direct user-page
  request returned 403; no challenge bypass attempted.
- Paid listings (Storyblocks SBV-349073021, Pond5 234492054, PIXTA 113909481)
  are **not licensed purchases** and their full footage was not inspected.
  Do not spend money, start trials, or treat watermarked previews as fixtures.
  A formerly found Dissolve listing now redirects to a shutdown announcement;
  do not repeat its stale price as an available purchase.

## Inspection tooling and remaining work

Installed [imageio-ffmpeg 0.6.0](https://pypi.org/project/imageio-ffmpeg/0.6.0/)
with `python -m pip install --no-deps --target .superpowers/fixture-tools imageio-ffmpeg==0.6.0`.
Its bundled Windows decoder identifies itself as FFmpeg 7.1. This is ignored
scratch tooling, not a project dependency, global installation, or PATH change.
`ffprobe` is still absent from PATH. Saved downloaded files, source metadata,
and contact sheets are local scratch evidence; they are not durable Git assets.

Next research can inspect the still-uninspected licensed Commons full videos
when normally accessible, or new stable-side stock candidates. Once a suitable
source is found, verify its exact reuse terms, inspect the full selected segment
and exact reference frames, probe and hash it, then establish the manifest.
No placeholder manifest, checksum, reference times, inference result, or completed
Task 4 checkbox was created. Step 2 implementation needs its own teaching checkpoint.
