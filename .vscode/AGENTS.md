# Shared editor guidance

Inherit [root guidance](../AGENTS.md). Follow the
[product brief](../docs/PRODUCT_BRIEF.md) and [decisions](../docs/DECISIONS.md).

- Keep shared editor instructions small and portable across contributors' machines.
- Do not introduce personal absolute paths, credentials, tokens, account details,
  or machine-specific service configuration into tracked editor files.
- Treat existing local configuration as user-owned; preserve it during unrelated
  work and do not copy its contents into project documentation.
- Editor integrations do not authorize installing services, transferring videos,
  or expanding the approved product scope.
- Prefer project-relative paths and documented package commands for shared tasks.
  Essential run and verification instructions must also work outside the editor.
- Do not add hidden build, network, or code-execution side effects to editor tasks.
