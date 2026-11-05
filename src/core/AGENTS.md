# Pose processing and analysis

Inherit [source guidance](../AGENTS.md). Follow the
[product brief](../../docs/PRODUCT_BRIEF.md) and [decisions](../../docs/DECISIONS.md).

- Keep processing independent of React. Separate decoded/model observations,
  deterministic measurements, and interpretations into explicit stages.
- D-037's workoutProgress reads validated manual history. Keep exact name/unit
  groups, actual-set provenance and deterministic ties throughout derived results.
- Preserve actual media timestamps in seconds. Variable-frame-rate videos have
  uneven frame intervals; do not invent time from frame index divided by FPS.
- If the detector needs strictly increasing timestamps, maintain that clock
  separately from media time and document behavior across clips and cancellation.
- State each quantity's units, coordinate system, camera assumptions, and inputs.
  Model-inferred world coordinates are estimates, not measured ground truth.
- Preserve missing poses and landmark uncertainty. Bound any gap filling and mark
  inferred samples; never silently turn a long unobserved interval into evidence.
- Make later smoothing, repetition detection, phase boundaries, and measurements
  reproducible from explicit inputs and documented, versioned parameters.
- Bound decoding/seeking/model waits and propagate cancellation and typed errors.
  Document shared-engine concurrency and resource-cleanup requirements.
- Keep observation quality separate from form interpretation. Abstain when the
  required evidence is unavailable; do not fabricate scores or LLM form judgments.
- Verify real-clip extraction and timestamp synchronization before adding metrics.
  Task 5 is an explicit ordering exception under D-021: the user asked to build
  later work despite the missing fixture. Implement the bounded image-space
  measurement design, preserving real-bench validation as an open requirement.
- Task9 (D-025) summarizes those same observed angles/counts with timestamped
  evidence. It does not add rep detection or validate range of motion/technique.
