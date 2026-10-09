# Changelog

All notable changes to this project are documented here. This project follows
[Semantic Versioning](https://semver.org).

Add notes under "Unreleased" as changes land; `npm version` moves them under the
new version's heading (see RELEASING.md).

## Unreleased

## 0.1.0 (2026-10-09)

First release, covering the complete Nusii API v2:

- Account, clients, proposals (including send and archive), sections (including
  copying reusable sections), line items (including price ranges), taxations,
  templates (including the public gallery), proposal activities, users, webhook
  endpoints, themes, currencies, locales, PDF page sizes and CRM integrations.
- All proposal filters: statuses, archived, query, recipient emails, never
  viewed, and created, sent, expires and accepted date ranges.
- Typed webhook payloads with `parseWebhookEvent()`.
- Pagination with `Page` objects and lazy `listAll()` iteration.
- Typed errors for every HTTP status, with validation details and error codes.
- Automatic retries (rate limits always, server and network errors on reads),
  timeouts and `AbortSignal` cancellation.
- API key and OAuth access token authentication, read from the environment by
  default.
- Zero runtime dependencies. ESM and CommonJS builds with type declarations.
