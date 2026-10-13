---
name: GitHub push authentication
description: Avoid incorrect retries when this Repl lacks GitHub CLI write access.
---

In this Repl, a successful `addIntegration` call did not authenticate shell pushes; GitHub still rejected them. A `GIT_URL` secret used for a retry must point to the GitHub clone URL, not a published Replit URL.

**Why:** Repeated push attempts failed despite the integration reporting success, and a later secret-based attempt targeted the wrong host.

**How to apply:** Before retrying a push, confirm the configured remote is GitHub without exposing any secret values. If using `GIT_URL`, request it through Replit Secrets and stop if GitHub rejects the credential.
