# Production homepage delivery

## Findings and limits

This project is Vite/React with an Express API and Prisma 7 **SQLite** schema. It previously shipped an empty React root, fetched CMS content after mounting, and replaced the whole homepage with an error when that request failed. The development Vite `/api` proxy does not exist on a static production host. The repository had no Render blueprint, its old Railway start command pointed to `dist/server.js` instead of `dist/backend/server.js`, and its environment example incorrectly described PostgreSQL without a matching Prisma schema/adapter. The migration history started with ALTER TABLE operations but lacked the initial schema.

These are verified repository defects. The exact failing request, service types, database state and logs of the existing Render deployment have **not** been verified: its frontend/backend URLs and Render access were not supplied. The configured canonical domain could not be reached through the available web tool. Do not claim the live deployment is fixed until the checks below pass there.

## Supported Render layout

Use the root `render.yaml`: one **Node Web Service**, serving both the built frontend and `/api` from the same origin. This is not a Render Static Site. It requires a persistent disk and therefore specifies the paid Starter plan; do not provision a new paid service without the owner's agreement. Adapting an existing service must preserve its existing database and media. Do not point an existing production shop at a new empty database as a shortcut.

Build from repository root:

```sh
npm ci --include=dev
npm --prefix backend ci --include=dev
npm --prefix backend run build
npm run build
```

Start with backend as working directory:

```sh
npm run start:production
```

Startup normalizes the SQLite path, creates an empty file only when absent, runs **prisma migrate deploy**, then starts the compiled server. It never runs `db push`, reset or development migrations. All 11 migrations were applied successfully to an isolated fresh database during verification.

Required configuration is listed in the blueprint. `VITE_API_URL=/api` is correct for this same-origin deployment. Set `PUBLIC_SITE_URL`, `VITE_SITE_URL` and `FRONTEND_URL` to the actual public HTTPS origin. Preserve payment, SMTP, admin and encryption secrets in Render; never put them into `VITE_*` variables. Render supplies `PORT`. Store the database, uploads, backups and public snapshot on persistent paths. Existing media must be copied through the established backup/restore process when changing disks. Configure Stripe and SMTP with the existing production settings.

The previous Netlify catch-all rewrite is a SPA-only deployment and does not provide this server HTML. Moving a static frontend to the Web Service is necessary for live CMS metadata and server content. The Vite development proxy remains development-only.

## Existing database migration history

Back up the existing database first. Inspect `prisma migrate status` and the actual schema before changing any baseline. The newly added `20260912000000_initial_schema` represents the base tables that previously existed outside the checked-in history. If those tables already exist, verify their columns against that migration, then record that baseline with the supported Prisma command:

```sh
npx prisma migrate resolve --applied 20260912000000_initial_schema
npx prisma migrate deploy
```

Do **not** run the resolve command on an empty database. If other historical migrations were applied outside Prisma, reconcile each against its SQL before marking it applied. A failed or divergent migration must be investigated, not blindly marked complete. Startup deliberately stops on migration failure. PostgreSQL is not interchangeable with this SQLite schema and migration history; an existing PostgreSQL deployment needs a separately planned schema/adapter/data migration after its actual configuration is confirmed.

## Rendering, publishing and resilience

`/`, `/shop` and `/collections/:id` now return React-rendered HTML containing headings, real catalog links, hero media, brand sections, navigation and footer. The document contains CMS-derived title, description, canonical, Open Graph, Twitter and Organization/WebSite metadata. Catalog entries without a configured market price remain crawlable without a fabricated price.

The client first hydrates the same shared public document using escaped JSON bootstrap data, then mounts the existing interactive application with that data. Cart, wishlist, filters, quick add and private account state remain client-owned. The preloader does not cover an already delivered public document. Product/account/admin routes retain their existing client application; this is not a framework migration or full-site SSR conversion.

Public data reads only the published configuration, never the draft. Save Draft and authenticated Preview remain private. Publish validates content, updates its version, writes the public snapshot and invalidates the in-process cache. The HTML/API use revalidation cache headers; the server coalesces concurrent reads and keeps a short 30-second cache. Product changes may take up to that interval to appear in document snapshots. Checkout still validates current prices and inventory independently.

On read failure the last in-memory/disk snapshot is served; without one, built-in brand content and working shop navigation are served. A slow read has a 1.5-second document data budget. The client revalidates once with an 8-second timeout and retains visible content. Invalid sections are skipped, critical sections have safe defaults, and section boundaries prevent one component error from erasing the page. Logs record versions and safe failure codes rather than credentials or raw database errors.

An unavailable Node process cannot serve even a cached document. The persistent-disk service avoids a sleeping free backend, but infrastructure outages still require normal monitoring and recovery.

## Verification

Local production startup was exercised using an isolated database, real migrations, compiled backend and Vite build. Raw HTTP source checks confirmed `/`, `/shop` and `/collections/first-release` return 200 with exactly one H1, catalog anchors, metadata and bootstrap content **without executing JavaScript**. Product/admin shell routes, public CMS, products, health and hero images were checked. Public CMS returns 200; unauthenticated admin CMS returns 401; unknown API paths return JSON 404. The configured production CORS origin is allowed.

Tests cover published/draft separation, source HTML, escaping, invalid sections, missing CMS/database fallback, persisted snapshot fallback, hotspot geometry, currency and checkout behavior. Browser hydration, real-device Safari and the actual Render deployment remain to be checked when those environments are available.

After deployment, request the live `/`, `/api/storefront/homepage`, `/api/products`, `/api/health` and hero image. Inspect **View Source**, not just Elements. Confirm one H1, published copy and actual product anchors. Publish a draft and verify new copy/metadata in a fresh raw request; verify the draft never appears before publishing. Test mobile Safari/private browsing, cart, wishlist, currencies and quick add, and inspect console/network for hydration, CORS and asset errors.
