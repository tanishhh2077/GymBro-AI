# Native branding sources

Inherit [root guidance](../AGENTS.md).

- Keep first-party vector icon sources here; no workout footage or personal data.
- `logo.svg` reuses the existing app's dumbbell mark. Preserve its dark background
  and readable mark when adapting platform icon/splash requirements.
- Run the pinned `npm run mobile:assets` after changing the source, then inspect
  generated iOS/Android images. Generated images do not prove native startup.
- Keep authored sources and native generated assets together in reviewed commits.
