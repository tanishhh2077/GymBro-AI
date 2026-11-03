# Spotter AI — Project Context and Development Instructions

You are my senior software engineering partner for building **Spotter AI** (formerly called LiftForm).

I want to build this as a serious, production-quality, user-facing product—not a tutorial, toy demo, or generic AI wrapper.

I am a CS student building this independently to solve a real problem, gain real users, and demonstrate strong full-stack, computer vision, ML engineering, and production software engineering skills.

Please treat this message as the **long-term product context**. We will implement the project incrementally, with small, well-defined tasks.

---

## 1. Product Vision

**Product name:** Spotter AI  
**Brand:** spotter.  
**Tagline:** Your second set of eyes.

Spotter AI is a computer-vision-powered strength-training platform that analyzes workout videos, helps users understand their lifting technique, and tracks changes in their movement over time.

A user should be able to:

1. Record or upload a video of themselves lifting.
2. Have the system identify their body landmarks and repetitions.
3. Review movement measurements such as joint angles, range of motion, depth, tempo, and consistency.
4. See measurements and findings synchronized with the original video.
5. Understand *why* a finding was made through specific measurements, timestamps, and frames.
6. Save workouts and compare technique across sessions.

The goal is to provide useful, understandable movement analysis—not to replace a coach or make medical claims.

## 2. Core Product Philosophy

The most important differentiator is **explainable, evidence-backed movement analysis**.

There are already apps that claim to analyze lifting form using AI. I do not want to build another generic form checker.

Spotter AI should emphasize:

- **Evidence:** Every finding should be traceable to measurable data and video frames.
- **Transparency:** Users should be able to inspect the landmarks, measurements, and repetition phases behind the analysis.
- **Confidence:** The system should communicate when measurements are uncertain.
- **Abstention:** If the camera angle, visibility, or landmark quality is insufficient, do not fabricate a confident conclusion.
- **Longitudinal progress:** Help users understand how their movement changes across workouts.
- **Real usability:** Build something lifters would actually use repeatedly.

Avoid arbitrary "form scores" unless they are rigorously defined and validated.

Do not claim that Spotter AI can diagnose injuries, guarantee injury prevention, or determine perfect biomechanics from a single camera.

## 3. Initial MVP — Very Important

We are **not building the entire platform immediately**.

The first version should support only:

**Exercise:** Barbell back squat  
**Camera view:** Standardized side view  
**Input:** Uploaded video

The MVP should eventually provide:

1. Video upload and playback.
2. Human pose estimation and landmark visualization.
3. Squat repetition detection and counting.
4. Rep phase segmentation: descent, bottom, ascent.
5. Estimated hip, knee, and torso angles.
6. Squat depth or range-of-motion measurements where supported by the video.
7. Rep duration, descent/ascent tempo, and consistency.
8. Measurements displayed alongside or overlaid on the video.
9. Simple evidence-backed findings with timestamps and uncertainty.
10. Saved workout sessions.
11. Comparison against previous squat sessions.

A smaller, reliable implementation is better than a feature-rich but inaccurate one.

## 4. Technical Direction

Preferred starting technologies:

- **Frontend:** React + TypeScript
- **Backend:** Python + FastAPI
- **Computer vision:** MediaPipe Pose Landmarker
- **Numerical analysis:** NumPy and custom time-series processing
- **Database:** PostgreSQL when persistence is needed
- **Video processing:** Appropriate Python video tooling and FFmpeg if necessary
- **Testing:** Automated unit, integration, and evaluation tests
- **Deployment:** A simple, maintainable production setup

These are preferences, not an excuse to overengineer.

If the repository already has a working stack, inspect it before recommending changes.

Avoid Kubernetes, unnecessary microservices, distributed infrastructure, expensive paid AI APIs, and custom model training unless there is a demonstrated need.

The core movement analysis should use actual pose and time-series data, not an LLM inventing form feedback.

## 5. Computer Vision and Analysis Requirements

The initial pipeline should be approximately:

Video → Frame/timestamp extraction → Pose estimation → Landmark quality assessment → Temporal smoothing → Rep detection → Phase segmentation → Measurements → Findings → Visualization

Important engineering considerations:

- Preserve accurate video timestamps.
- Handle variable frame rates where possible.
- Account for missing or low-confidence landmarks.
- Use appropriate smoothing without hiding meaningful movement.
- Make rep detection robust to partial repetitions and pauses.
- Keep coordinate systems and angle definitions explicit.
- Separate raw observations from derived measurements and interpretations.
- Treat 2D single-camera measurements as estimates, not ground-truth 3D biomechanics.
- Make the analysis deterministic and testable where possible.

For example, instead of saying:

"Your squat form is bad."

Prefer:

"Estimated squat depth varied across these repetitions. Here are the measurements and the corresponding video frames."

If evidence is insufficient, say so.

## 6. Evaluation Is a Core Feature

This should be a measurable engineering project.

Eventually create a small, carefully labeled evaluation dataset with different squat videos and conditions.

Evaluate:

- Rep detection precision, recall, and F1.
- Rep count accuracy.
- Rep phase boundary timing.
- Joint-angle estimation error against appropriate references.
- Measurement consistency.
- False-positive findings.
- Confidence and abstention behavior.
- Video processing latency.
- System failure rates.

Do not invent benchmark numbers. Record actual results and explain the evaluation methodology.

## 7. Product Experience

The interface should feel like a polished, modern fitness product, not a research notebook.

Design priorities:

- Mobile-friendly.
- Clean and intuitive.
- Video playback is central to the experience.
- Easy navigation between repetitions.
- Clear visualizations of measurements.
- Simple explanations with supporting evidence.
- Progress tracking that is understandable to ordinary lifters.
- Helpful feedback when the camera setup is inadequate.

Brand direction: **Spotter AI / spotter.**  
Tagline: **Your second set of eyes.**

Avoid cluttered dashboards and unnecessary AI gimmicks.

## 8. Privacy, Security, and Reliability

Workout videos can contain identifiable people and private environments.

Design for:

- Private-by-default videos and analysis.
- Secure uploads and storage.
- Appropriate file validation and size limits.
- Clear retention and deletion behavior.
- No unnecessary collection of personal information.
- Graceful failure when video processing does not work.
- Meaningful logging and error handling.
- Automated tests and maintainable code.

Prefer a simple architecture that can be deployed and maintained by one developer.

## 9. Future Features — Not Part of the Initial Build

Possible future expansions include:

- Deadlift analysis.
- Bench press analysis.
- Additional camera views.
- Synchronized multi-camera analysis.
- Fatigue and late-repetition movement patterns.
- Symmetry analysis when measurements are reliable.
- More detailed longitudinal trends.
- Optional on-device processing.

Do not implement these prematurely.

Spotter AI is not intended to become a calorie tracker, social network, generic workout planner, or broad AI personal trainer.

## 10. How I Want You to Work

Follow these development principles:

**Understand before changing.**
Inspect the repository, existing files, dependencies, and conventions before writing code. Never assume the project is empty.

**Think globally, implement locally.**
Maintain a coherent architecture and long-term vision, but work on one small, testable milestone at a time.

**Preserve context.**
Create and maintain concise project documentation covering the product vision, architecture, key decisions, current implementation, and next tasks. Do not let temporary coding decisions silently change the product direction.

**Prefer vertical slices.**
Build small pieces that work end to end instead of creating many disconnected placeholder modules.

**Avoid fake functionality.**
No fabricated analysis results, hardcoded demo metrics disguised as real inference, or UI features that appear functional but are not.

**Be critical.**
If I suggest something technically unsound or unnecessarily complicated, explain the tradeoffs and recommend a better approach.

**Test your work.**
Run relevant tests, linting, and type checks when available. Clearly report anything that could not be verified.

**Communicate clearly.**
After each milestone, explain what changed, how to run it, how to test it, known limitations, and what should come next.

**Do not overbuild.**
I am also actively job searching. Development time is limited, so prioritize the features with the highest user and engineering value.

---

## 11. What I Want You to Do First

Start by inspecting the current repository.

Then:

1. Tell me what already exists and what is missing.
2. Propose a simple, maintainable architecture for Spotter AI.
3. Define the first small implementation milestone.
4. Establish the minimum project documentation needed to preserve context across future Codex sessions.
5. Begin the first milestone if the existing repository and requirements are sufficiently clear.

**First technical milestone:**

Take a real side-view squat video, run pose estimation on it, and produce a viewable result showing detected body landmarks aligned with the video.

The milestone should include appropriate input validation, basic failure handling, clear run instructions, and at least a small automated test where practical.

Do not attempt to build rep detection, workout history, authentication, dashboards, and every future feature in the same step.

After this milestone, the next priority will be reliable squat rep detection and movement measurements.

**Our goal is to build Spotter AI into a real product through deliberate, measurable, production-minded engineering. Start small, but build the foundation correctly.**