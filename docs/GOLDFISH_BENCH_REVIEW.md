# Independent bench-specification review

Date: 2026-11-02. This fresh reviewer received the original brief, accepted amendments, current specification/plan, relevant instructions and read-only source access, without the Elephant conversation. The original squat review is preserved separately.

## Verdict and findings

The bench revision faithfully reflects D-014 and is implementable. Generic extraction, lifecycle and playback work can proceed. The reviewer identified two medium acceptance ambiguities:

1. M1-04's "in-range coordinates/times" conflicted with preserving raw off-image observations. Rejecting or clamping hidden lower-body estimates could incorrectly discard useful bench upper-body observations.
2. Nonempty pose data plus projection consistency could pass for a spotter instead of the bench lifter. "Usable" observations needed an explicit intended-lifter acceptance gate.

## Disposition

Both clarifications were adopted because they follow the existing evidence/missingness requirements, without adding automatic identity detection or biomechanics features:

- Required raw coordinates must be finite; finite off-image estimates are preserved. Video times must be in range; drawing hides out-of-image/unsupported coordinates.
- Manual reference-sample inspection must confirm useful visible upper-body observations belong to the bench lifter. Wrong-person or unusable upper-body output blocks real-video acceptance despite passing structural checks.

The specification and plan now state these requirements. No runtime behavior or accuracy result was asserted by this review.

## Limits

The reviewer read the brief, decisions, specification, full plan, workflow/architecture/status, and relevant source. It did not edit files, install packages, run tests/builds, launch a browser, download footage, or perform inference. Candidate framing, decoding, bench detection quality, and runtime performance remain unverified.
