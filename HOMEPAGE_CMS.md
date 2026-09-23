# VESTIGIA homepage CMS

Open **Admin → Homepage** (`/admin/homepage`). Existing admin authentication protects editing, product/media searches and draft previews. No additional admin credentials or service are introduced.

## Workflow

1. Select a section. Edit its copy, images, links, product source and display options.
2. Drag sections or selected products to reorder; Up/Down buttons provide a keyboard and touch fallback.
3. **Save Draft** stores the draft without changing the public homepage.
4. **Preview Draft** saves pending edits and opens a private iframe at 1440, 768 or 390 pixels. The preview API requires the existing bearer token; a URL alone cannot access drafts.
5. **Publish** asks for confirmation, validates and atomically copies the saved draft to the published configuration. Revision checks reject stale saves/publishes from another session.

Hero, announcement and newsletter are structural sections: disable them instead of deleting them. Announcement is always placed above navigation; other sections follow their stored order. Editorial and product sections may be added, duplicated or removed. Unsaved edits prompt on navigation and page exit.

## Content and catalog

Hero/banner editors provide desktop/mobile images, crops, height presets, alignment, overlays and CTA pairs. Hero hotspots reference real product IDs. Split editorials share layout and aspect-ratio options. Lookbook images have alt text, captions, links, visibility and ordering controls. Newsletter reuses the existing subscription endpoint, including confirmation-email behavior.

Product carousels support manual IDs, newest catalog insertions, category collections and actual paid-order rankings. Existing products lack creation timestamps, so monotonically assigned IDs determine newest/oldest order. The application has no separate collection or tag database: the picker clearly exposes its existing categories instead of inventing collection IDs. There is no synthetic best-seller fallback when sales data is empty. Deleted references are skipped and reported to admins; products without active prices in the selected currency are omitted. Pricing, variants, cart and wishlist continue to use the existing catalog/context.

New Arrivals, First Release and Most Wanted use the same scroll-snap carousel. Desktop supports grid, carousel and lead-product layouts; mobile uses swipeable cards with a visible next item. Optional autoplay pauses during interaction and supports a persistent Pause button and reduced-motion preferences.

Footer copy, ordered navigation groups, social links and homepage SEO are editable in the builder. Empty social destinations are not seeded. Homepage content comes from the published record, not JSX defaults. Default content is used only during the initial database seed.

## Storage and API

- `Homepage`: draft/published JSON, draft and published revisions, publication/modification timestamps, modifying admin identity.
- `HomepageMedia`: selected/uploaded local image dimensions, file size and MIME metadata. Alt text belongs to each section/image placement. The existing upload API and storage paths are reused; originals are not deleted by the CMS.
- `shared/homepage.ts`: discriminated section types, defaults, plain-text/URL/structure validation shared by client and server.
- `shared/homepageProducts.ts`: deterministic product selection against current market prices.
- `backend/utils/homepageRoutes.ts`: protected CMS routes, public published configuration, paid-order feed, paginated searches and media library.
- `src/admin/homepage`: builder, section editors, product/category/media pickers and responsive preview controls.
- `src/homepage`: published configuration provider, section renderer, carousel, newsletter, footer and protected preview route.

Public: `GET /api/storefront/homepage`, `GET /api/storefront/homepage/best-sellers`.

Admin: `GET /api/admin/homepage`, `PUT /api/admin/homepage/draft`, `POST /api/admin/homepage/publish`, `GET /api/admin/homepage/preview`, plus `products`, `categories` and `media` under `/api/admin/homepage`.

Public configuration revalidates with an ETag; protected responses use `no-store`. Publishing refreshes the current window and other same-origin tabs; focus also refreshes the configuration. Draft content is never included in the public response. The existing database backup system captures the new tables.

## Migration and deployment

Additive SQL migrations:

- `20260924000000_homepage_cms`
- `20260924000001_homepage_media`
- `20260924000002_homepage_hero_art_direction`
- `20260924000003_homepage_mobile_source`

Generate the Prisma client and build the backend before starting the upgraded server. Apply these migrations using the deployment's migration process; do not reset the database. For this project's existing local SQLite database, which has incomplete historical Prisma migration bookkeeping, run `node migrate-homepage.mjs` from `backend` after building. The helper backs up the local database, adds missing tables and seeds the homepage only if absent. Re-running it preserves saved/published content. It refuses database paths outside the project-local directory.

The local migration has been applied. A newly deployed empty CMS is initialized once from existing product IDs and the current announcement setting. Restart an already-running backend so it loads the new routes/client. No production deployment is performed by this change.

## Verification

```text
npm run build
npm --prefix backend run build
cd backend
node --test dist/backend/tests/homepage.test.js dist/backend/tests/pricing.test.js
```

The CMS tests exercise protected endpoints, draft isolation, preview, publishing, concurrency conflicts, disabled/reordered sections, deleted references, schema rejection, and manual/automatic product order and market-price sorting. Existing pricing tests cover quote, payment currency, refunds and tax regression behavior.

Actual browser rendering and interaction tests remain required at 320, 360, 375, 390, 430, 768, 1024, 1280, 1440, 1728 and 1920px. The available browser runtime reported no browser session during implementation. In particular, verify image crops, swiping/arrows, keyboard focus, uploads, mobile menu, newsletter, preview widths and unsaved-navigation prompts before production release. No live payment or newsletter email was sent during validation.

## Hero art direction

The original campaign asset is **1254 × 1254**. Centered `object-fit: cover` in a wide desktop hero discards the upper and lower portions; the foreground model's hair starts close to the top of the original. No landscape campaign asset was found in the repository. The bundled square fallback therefore uses desktop/tablet **50% 0%**, preserving heads at the expense of more lower-body crop. Mobile retains its existing image and **50% 50%** composition.

`HeroImage` renders a single `<picture>` with mobile sources through 767px and desktop sources from 768px. Desktop, tablet and mobile have independent numeric focal points; the admin also offers a click/keyboard focal-point picker and vertical presets. An empty mobile source falls back to desktop. Known local campaign variants supply 768w/1254w responsive candidates. Hero media loads eagerly at high priority, has a stable container and no image scale animation or `contain` letterboxing.

Default full hero heights: desktop 88svh, tablet 84svh, mobile 88svh. Announcement is in normal flow; navigation overlays the image, with no duplicate header-height subtraction. Desktop headings use 56–88px sizing without changing mobile typography.

**Asset limitation:** a dedicated landscape campaign photograph (ideally 1920 × 1080 or 1920 × 1200) is still needed for the preferred wide composition showing more lower body. Upload it as Desktop Hero Image; leave the existing Mobile Hero Image in place and use Preview Draft to review each crop. Visual verification at 1440 × 900 and 390 × 844 remains pending browser availability.
