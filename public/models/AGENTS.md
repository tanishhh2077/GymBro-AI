# Pose model assets

Inherit [public-file guidance](../AGENTS.md). Follow the
[product brief](../../docs/PRODUCT_BRIEF.md) and [decisions](../../docs/DECISIONS.md).

- These binary assets power local pose inference. Keep paths consistent with the
  processing configuration and verify model/runtime compatibility when changing them.
- Record the publisher, source URL, model variant/version, license, acquisition
  steps, and checksum for a replacement. Do not invent missing provenance.
- Treat model binaries as vendor artifacts; replace reproducibly rather than
  editing their contents by hand.
- Validate replacement behavior with real footage, including missing poses and
  performance on intended devices, before claiming equivalent behavior.
- A pose model is not an exercise classifier or validated biomechanics instrument.
  Do not infer exercise support or measurement accuracy from the model filename.
- Do not store user videos, extracted personal data, or secrets beside the model.
