# Security & performance backlog

Created: 2026-09-03. This is a recorded remediation backlog; no item below is
considered production-ready until it is closed and tested.

## P0 — before production

- Require a production-only, high-entropy `SECRET_KEY`; fail startup if it is missing or still the development default.
- Disable `DEBUG`, demo-account seeding and test credentials outside development.
- Apply file-space authorization predicates directly in `FileService.list_files` and `get_tree`.
- Enforce upload size, extension/content validation, generated storage filenames and safe collision handling.

## P1 — near term

- Move refresh tokens from browser storage to Secure, HttpOnly, SameSite cookies; retain access tokens only in memory.
- Validate login redirect paths and upgrade React Router to a patched release.
- Add login, refresh, upload and Agent rate limits plus audit events.
- Provide a Redis health/degraded-mode path for logout and Agent configuration.
- Run dynamic tools in restricted containers with per-tool authorization, CPU/memory/time limits, read-only mounts and egress controls.

## Quality and performance

- Make `pnpm --filter=aixsilicon-web run typecheck` pass and enforce it in CI.
- Add backend tests for authentication, RBAC, file isolation and uploads; install and run pytest in CI.
- Split the frontend bundle by route and lazy-load chart, file-center and permission-management code.
- Replace SQLite with a managed production database and add migrations.
