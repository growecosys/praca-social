# Moving Praça from Cloudflare (D1 + R2) to Vercel (Neon + Blob)

The code port is done: the app builds with `next build`, queries run on Postgres and uploads go to a private Blob store. **No production data has been moved.** This runbook covers that part. Never commit exports; they contain credential hashes, recovery data and personal information.

## What exists

| Piece                                      | Tool                                         | Verified by                      |
| ------------------------------------------ | -------------------------------------------- | -------------------------------- |
| Postgres schema (50 tables, identical to the SQLite history) | `npm run db:migrate`                | `tests/postgres-dialect.test.mjs` |
| D1 export → Postgres, with reconciliation  | `scripts/import-sqlite.mjs`                  | `tests/import-sqlite.test.mjs`   |
| Legacy reciprocal-poke recovery            | `scripts/recover-legacy-connections.mjs`     | `tests/legacy-recovery.test.mjs` |
| R2 → Blob transfer with manifest and verify | `scripts/transfer-r2-to-blob.mjs`           | `tests/transfer-r2.test.mjs`     |
| Hourly stories tick, monthly Espaço Comum  | `vercel.json` crons                          | endpoints are idempotent GETs    |

The old SQLite migrations are kept in `tests/fixtures/sqlite-migrations/` for reference, rollback and as the fixture for the importer test.

## Before you start

1. Create an isolated Neon branch and a separate Blob store for rehearsal. Preview deployments must never share the production database or store.
2. Inventory the live D1 schema. The importer reports any table in the export that has no destination (drift) and any column it drops; resolve those before cutover.
3. Get a complete export. With Cloudflare access: `npx wrangler d1 export <actual-database-name> --remote --output=praca-d1.sql`, then `sqlite3 praca.sqlite < praca-d1.sql` and `sqlite3 praca.sqlite 'PRAGMA integrity_check; PRAGMA foreign_key_check;'`. Without it, a protected, paginated export Worker is needed; the read-only table viewer is not enough.

## Rehearsal (repeat until clean)

```bash
npm run db:migrate                                     # on the empty rehearsal database
node scripts/import-sqlite.mjs praca.sqlite            # validates in a transaction and rolls back
node scripts/import-sqlite.mjs praca.sqlite --apply    # commits; target must be empty
node scripts/recover-legacy-connections.mjs --apply    # idempotent; omit --apply for a dry run
R2_… BLOB_READ_WRITE_TOKEN=… node scripts/transfer-r2-to-blob.mjs
R2_… BLOB_READ_WRITE_TOKEN=… node scripts/transfer-r2-to-blob.mjs --verify
```

The importer copies IDs, UUIDs, hashes, salts, JSON and timestamps verbatim, advances all identity sequences, and exits non-zero if any table count differs. Run the transfer **after** the import: avatar history recovery skips keys already recorded in `avatar_generations`, so original generation dates are kept (Blob's own timestamp is the transfer time).

The transfer keeps each logical key as the Blob pathname, so existing `/media/<key>` and `/avatar/<id>` URLs keep working, and writes `transfer-manifest.jsonl` with key, size, content type, SHA-256, the original R2 timestamp and owner metadata (Blob keeps neither). Keep that file private.

Then exercise, against the rehearsal environment: login with an existing account (PBKDF2 hashes are preserved), recovery and e-mail links, profile editing, avatar history, posts with images, comments, circles (chat, agreements, funds), games, governance, notifications and a few old share links.

## Cutover

1. Stop production writes, including scheduled jobs and AI processing; drain in-flight work.
2. Take the final D1 and R2 snapshots.
3. Run the import, recovery and transfer against the production Neon database and Blob store; confirm reconciliation and `--verify` are clean.
4. Set production environment variables (see `.env.example`); `AUTH_EMAIL_ORIGIN` must be the production origin.
5. Deploy, smoke test, then point `praca.social` at Vercel. Enable the crons only after this; do not leave the old scheduler running against another dataset.
6. Make the old Sites URL read-only so it cannot accept writes into a separate live dataset.

## Rollback

Keep the old source, D1 database and R2 bucket. Before the new site takes writes, rollback is a DNS change. After it takes writes, DNS reversal alone would lose or split new activity: the new writes must be exported and reconciled back first.

## Known differences from Cloudflare

- Rate limiting uses `x-real-ip` / `x-forwarded-for` instead of `cf-connecting-ip`.
- `CURRENT_TIMESTAMP` in raw SQL is translated to the app's text timestamp (`lib/sql-dialect.ts`).
- `LIKE` in user search is `ILIKE` (SQLite's `LIKE` ignored case).
- Image function duration on Vercel depends on the plan; measure generated-image routes before relying on them.
