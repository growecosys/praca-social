# Praça Social

Publish ideas, find people and look after what is common. The app has the Mural, profiles, Círculos, Histórias da Praça, Espaço Comum and small games.

It is a Next.js 16 (App Router) app that runs on Vercel with **Neon Postgres** (data) and **Vercel Blob** (images).

## Run locally

Requires Node.js 22.13 or newer and npm.

```bash
npm ci
cp .env.example .env.local   # fill in DATABASE_URL and BLOB_READ_WRITE_TOKEN
npm run db:migrate           # creates the schema in the database DATABASE_URL points to
npm run dev                  # http://localhost:3000
```

`npm run db:migrate` is idempotent and can be re-run. Use a Neon branch (not production) for local work.

## Environment

| Variable                                       | Purpose                                                                |
| ---------------------------------------------- | ---------------------------------------------------------------------- |
| `DATABASE_URL`                                 | Pooled Neon connection used by the app                                 |
| `DATABASE_URL_UNPOOLED`                        | Direct Neon connection used by migration and import scripts            |
| `BLOB_READ_WRITE_TOKEN`                        | Private Vercel Blob store (uploads, avatars, generated images)         |
| _(none)_                                       | AI features use the Vercel AI Gateway; Vercel authenticates it automatically, so no key is needed |
| `RESEND_API_KEY`, `AUTH_EMAIL_FROM`, `AUTH_EMAIL_ORIGIN` | E-mail access links; optional. `AUTH_EMAIL_ORIGIN` must be the HTTPS origin of the environment that receives the links |

## Scripts

| Command                        | What it does                                                      |
| ------------------------------ | ----------------------------------------------------------------- |
| `npm run dev` / `build` / `start` | Standard Next.js                                               |
| `npm test`                     | Builds, then runs every test (SQL is validated against Postgres)  |
| `npm run typecheck` / `lint`   | `tsc` and ESLint                                                  |
| `npm run db:generate`          | Generates a new Drizzle migration after editing `db/schema.ts`    |
| `npm run db:migrate`           | Applies pending migrations from `drizzle/`                        |

## How data access works

- Drizzle (`db/`) and raw SQL both run on one `pg` pool (`lib/sql.ts`). Raw SQL keeps the original `prepare().bind().first()/all()/run()` and atomic `batch()` shape, so `?` placeholders are rewritten to `$n`.
- Timestamps are text in `YYYY-MM-DD HH:MM:SS` UTC and flags are 0/1 integers, as before. Millisecond epochs are `bigint`.
- `lib/env.ts` exposes `env.DB` and `env.BUCKET` (a Blob-backed store, `lib/blob-bucket.ts`). Object keys are Blob pathnames, so `/media/<key>` and `/avatar/<id>` URLs are unchanged.
- `tests/postgres-dialect.test.mjs` extracts every SQL statement from the source and `PREPARE`s it against the real schema. Run it after touching any query.
- Scheduled work is configured in `vercel.json`: a daily Histórias tick and the monthly Espaço Comum reconciliation (00:00 America/Sao_Paulo on day 1). These fit the Hobby plan (daily at most). The tick is also advanced when people open the game, so on a Pro plan change `0 3 * * *` to `0 * * * *` for hourly precision.

## Moving production data

See [docs/vercel-migration.md](docs/vercel-migration.md) for the import, object transfer, cutover and rollback runbook.
