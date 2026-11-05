# Shared data contracts

Inherit [source guidance](../AGENTS.md). Follow the
[product brief](../../docs/PRODUCT_BRIEF.md) and [decisions](../../docs/DECISIONS.md).

- Keep contracts usable without React and explicit about their meaning.
- D-037 progress contracts carry actual recorded set identity, numeric pairs and
  exact unit groups through summaries and source-workout navigation.
- Distinguish model observations, calculated measurements, and interpreted
  findings. A landmark position alone is not a finding about lifting form.
- Specify units, media timestamps, coordinate systems, and provenance where
  relevant. Inferred world coordinates do not establish validated biomechanics.
- Represent unavailable values explicitly; zero is a valid measurement, not a
  replacement for missing evidence. Preserve uncertainty and reasons to abstain.
- Future findings should identify supporting measurements and video times, the
  assumptions they require, and limitations that affect interpretation.
- Do not introduce arbitrary form scores or medical diagnoses. The legacy
  `score`/`overallScore` scaffolding was removed (D-028); do not restore it.
- Future contract changes must update producers and consumers together. Do not
  change application types as part of documentation-only work.
- Keep later persistence and API contracts separate from browser object URLs and
  other temporary runtime handles.
- D-034 permits schema2 routine contracts and optional planned set/rep targets.
  Never represent a target as a logged set or a live link to workout history.
