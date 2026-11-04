# iOS native wrapper

Inherit [root guidance](../AGENTS.md); scope is D-022 and the mobile design/plan.

- This project embeds the shared React build; keep analysis and interface logic
  in `src/`. Do not introduce a separate Swift analyzer or video upload path.
- Preserve `com.gymbroai.app` / GymBro AI identity. No signing team, credentials,
  provisioning profile, store submission or paid build service in this prototype.
- Use `npm run mobile:sync` from the root after shared changes. `App/App/public`
  and generated Capacitor config are ignored copies: do not edit or put guidance,
  footage or personal information inside them.
- Capacitor manages `App/CapApp-SPM/Package.swift`; change plugin dependencies
  through the root package manifest and sync, not by hand-editing that package.
- This top-level guidance covers generated native subdirectories. Do not add
  Markdown inside the Xcode asset catalog or copied web assets.
- Windows source generation is not native compilation. Record macOS/Xcode,
  simulator launch and signed physical-device verification separately.
