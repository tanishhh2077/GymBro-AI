# Vision data and model search (2026-11-08)

Claude Code (Opus 5.5) web search, summaries only. **No dataset or model below was
downloaded, read in full or tested.** Licence lines are as reported by search
results; read each LICENSE file before any use. This is input to a design, not an
accepted decision.

## User decision (2026-11-08)

The vision feature should cover six exercises before any others: bench press,
chest press (machine), seated row (cable), biceps curl, triceps pushdown and
shoulder press. This supersedes the bench-only scope of D-014 for planning; a
design/plan and a DECISIONS entry are still needed before building.

## Findings

- **No ready-made model does this.** No Hugging Face model classifies gym exercises
  from video or counts reps for these lifts. The closest is an image-only SigLIP2 gym
  classifier (prithivMLmods/Gym-Workout-Classifier-SigLIP2). General video models
  (VideoMAE, Kinetics) would need fine-tuning and are too heavy for on-device use.
- **The common working approach** is what we already run: on-device pose landmarks
  (MediaPipe) plus per-exercise joint-angle rules and a rep state machine.
- **Pose models.** MediaPipe/BlazePose (Apache-2.0, what we ship) stays the best fit
  for iOS/Android/web. MoveNet (Apache-2.0, 17 points) is faster but less accurate at
  ankles. RTMPose code is Apache-2.0 but the licence of its pretrained weights is
  unresolved (open-mmlab/mmpose issues 3275, 3277, 3281); avoid it until that is settled.
- **Bench press is a hard case.** A powerlifting MediaPipe project dropped bench
  because the bar and bench hide joints in 2D video. A resistance-training study
  found elbow and shoulder landmarks the most stable; wrists near the bar are the weakest.
- **Datasets.**
  - Kaggle hasyimabdillah/workoutfitness-video: videos of bench press, shoulder press,
    biceps curl, triceps pushdown, chest fly machine, T-bar row and more. **CC BY-NC-SA
    4.0** (non-commercial): usable for private evaluation only, never shipped.
  - Kaggle dp5995/gym-exercise-mediapipe-33-landmarks: MediaPipe landmarks for curl,
    shoulder and triceps classes (no bench, pushdown or row). Licence unchecked.
  - Kaggle riccardoriccio/real-time-exercise-recognition-dataset: squat, push-up,
    curl, shoulder press, partly synthetic. Licence unchecked.
  - InfiniteRep (Infinity AI): synthetic avatars with rep labels, **CC BY 4.0**
    (commercial allowed per its official page). Exercise list unchecked.
  - Fitness-AQA (ECCV 2022): expert form-error labels for back squat, barbell row and
    overhead press; licence is a PDF in its repo, unread.
  - Qualcomm QEVD: 460+ hours of fitness video, Qualcomm Data Research License,
    likely research-only.
  - Kaggle squat-exercise-pose-dataset: CC BY 4.0, but its "incorrect" examples are
    synthetic perturbations, not real errors.
  - No public dataset was found for machine chest press or seated cable row with
    pose labels.
- **Reference code (MIT, per search results):** leonardo-carnevalli/pose-rep-counter
  (browser, client-side, declarative per-rep form rules), 1yakub/PoseEstimationProject
  (browser WebAssembly and Python, curl), NgoQuocBao1010/Exercise-Correction,
  Jacob-Pitsenberger/Upper-Body-Workout-Assistant-with-MediaPipe (curl, shoulder
  press, triceps extension), coach-who-codes/ai-rep-counter. Confirm each LICENSE
  and keep the notice if any code is copied.

## Implications

Datasets give evaluation footage, not a model to drop in. Each of the six exercises
still needs its own landmarks, angle definitions, rep rule, camera-view guidance,
an "unavailable" outcome, and checking against real videos. Non-commercial datasets
must stay out of the repo and the shipped app.
