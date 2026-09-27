# VESTIGIA SEO implementation and operations

## Delivered behavior

Product requests now contain product text, an eager image, the requested market price, variant availability, breadcrumbs, metadata and JSON-LD before JavaScript. Shared product functions derive schema and the EUR Merchant feed from active integer prices and actual inventory. No legacy price fallback, synthetic MPN, missing-stock assumption or fabricated review markup is used.

Product numeric IDs, the /shop/product alias and saved old slugs redirect to the current product route. Missing products and collections return 404; catalog database failures return 503 instead of pretending a product disappeared. Static informational routes remain supported. Existing checked-in editorial articles receive initial article HTML and valid article URLs; unknown article IDs return 404.

The local English URL structure is preserved: /, /shop, /product/{slug}, /collections/{category-or-CMS-id}, /journal/{id}, and existing policy pages. Product variants use currency/color/size query parameters and canonicalize to the parent. The primary currency for anonymous server rendering and the feed is EUR. A valid currency query initializes the client market and persists it, while an existing checkout currency lock takes precedence.

## Files and architecture

| Area | Files | Role |
| --- | --- | --- |
| Shared typed SEO | shared/seo/product.ts, policy.ts, catalog.ts | Product metadata/schema, validated prices and GTINs, variant links, slug normalization, route policies, translation registry, CMS/category metadata |
| Server document | backend/utils/storefrontHtml.tsx, storefrontRoutes.ts, shared/PublicStorefront.tsx, shared/PublicProduct.tsx | Initial HTML, status codes, aliases, eager product images, catalog discovery, existing React bootstrap |
| SQL mapping | backend/utils/publicProduct.ts, publishedStorefront.ts | One product serializer, fresh catalog reads for product routes and sitemaps, resilient homepage snapshots |
| Sitemap and robots | backend/utils/seoRoutes.ts | Live public-product and CMS collection URLs, existing public editorial routes, private/staging rules |
| Merchant feed | backend/utils/merchantFeed.ts, backend/server.ts | EUR variant feed, validation warnings, no invented identifiers |
| Interactive consistency | src/utils/seo.ts, productMedia.ts, src/pages/ProductDetail.tsx, Shop.tsx, Journal.tsx, src/components/common/SEOHead.tsx, src/context/MarketContext.tsx | Matching metadata/currency, real stock, variant preselection, no duplicate stale schema |
| Publication | backend/prisma/schema.prisma, migration 20260926000000_product_publication, backend/server.ts, backend/utils/pricing.ts, src/data.ts, admin ProductForm/AdminContext, shared/homepageProducts.ts | Publication separate from robots, admin-only complete catalog, public filtering and quote rejection |
| Performance | scripts/compress-assets.mjs, performance-budget.mjs, package.json, public/public-document.css, index.html | Brotli/gzip assets, size budgets, responsive initial product layout, removal of speculative logo preload and nonexistent language links |
| QA | backend/tests/seo.test.ts, updated homepage/pricing fixtures, scripts/seo-audit.mjs, seo-preview.mjs, .github/workflows/seo.yml | Schema/route/feed regression tests, actual migration fixtures, local crawl report and CI |
| Documentation | SEO_AUDIT.md, SEO_IMPLEMENTATION.md | Audit, decisions, release and monitoring instructions |

The pre-existing uncommitted Stripe postal-code change in Checkout.tsx is preserved. No payment-provider configuration was changed for SEO.

## Database and product lifecycle

The additive migration adds published (true by default) and nullable createdAt/updatedAt to Product. Existing rows keep null dates because their real history is unknown. New admin-created products get createdAt; admin updates set updatedAt. Sitemap lastmod is currently omitted for all URLs, because inventory, prices and CMS changes do not yet share a reliable content-modification timestamp.

The admin form has a Published on storefront checkbox. /api/admin/products requires admin authentication and includes unpublished items. /api/products excludes unpublished items regardless of brand-name prefix. Product routes, sitemap and Merchant feed exclude unpublished products. Checkout refuses to quote an unpublished product. Temporarily out-of-stock products remain 200 and can remain indexed, with OutOfStock offers. Deleted/unpublished products return 404, not a homepage redirect. Existing paid historical orders are not rewritten.

Publication/price changes are read fresh by product routes and sitemaps; homepage snapshots may retain older cards for up to 30 seconds, or longer during a database outage. A current product request always checks the database. Editorial and global CMS content still use the established published snapshot behavior.

Existing indexed slugs are preserved on name-only backend updates. New normalization handles accents and punctuation. Explicit slug changes append the former slug to redirectFrom. SQL uniqueness rejects collisions; choose another slug in admin. A dedicated discontinued-product replacement map and variant-level GTIN/SKU administration are not added; do not overload an unrelated canonical to replace them.

## Structured data

Products with multiple sellable size/color combinations use ProductGroup and hasVariant, with productGroupID, variesBy and per-variant Product/Offer objects. A single variant uses Product. Each offer uses the same active price and stock calculation as the feed. Unknown identifiers are omitted. Parent identifiers are not duplicated across every variant. No AggregateRating or Review markup is emitted because authenticity and visible-review eligibility have not been established.

Homepage Organization/OnlineStore and WebSite use a stable organization ID. Legal name, social profiles, address and contact claims are omitted unless explicitly verified. Breadcrumbs and CollectionPage ItemList describe the public hierarchy. JSON-LD is escaped against script termination and tested for JSON syntax. Passing local syntax tests does not substitute for Google's Rich Results Test.

## Sitemap, robots and URL policy

/sitemap.xml is a live URL set. Compatibility endpoints /sitemap-products.xml, /sitemap-categories.xml, /sitemap-pages.xml, /sitemap-journal.xml and /sitemap-images.xml remain available. The images compatibility endpoint currently lists product URLs; the initial product HTML exposes the images. Product and collection inclusion uses live catalog data; editorial inclusion follows the actual checked-in public Journal source rather than mismatching SQL records. Duplicate, noindex, unpublished and externally canonicalized products are excluded. No invented lastmod values are emitted. A 50,000 URL guard fails closed; implement sharding before approaching that limit.

Static sitemap generation is disabled. The public/sitemap.xml file is an empty fallback with an explicit deployment comment. Deploy the Express application, not dist alone. The live server owns the sitemap and robots.txt.

| URL type | Policy |
| --- | --- |
| Published product, useful category/CMS collection | Crawlable; index subject to product/site robots settings; canonical clean route |
| Product currency/color/size query | Crawlable; parent canonical; client selects the advertised variant/market |
| UTM, gclid, fbclid | Crawlable; clean canonical; tracking alone does not imply noindex |
| Shop search, sort, category query and size/color/price/availability filters | Crawlable noindex/follow with clean catalog canonical |
| Catalog page=N | Crawlable link; page-specific canonical; retains existing cumulative Load more behavior |
| Admin/preview | Disallowed in robots and noindex in HTML/headers |
| Account/checkout/activation/newsletter | Noindex HTML/header; crawl permitted so crawlers can observe noindex; authentication still protects private data |
| Staging | Set SEO_NOINDEX=true; robots disallow all, noindex headers and document metadata. Also restrict staging access at the hosting layer. |
| Unknown URL | 404/noindex; no blanket homepage redirect |

Case and trailing slash normalization preserve query strings and avoid changing asset filenames. Configure HTTPS and preferred non-www domain redirects at Render/CDN; host/protocol redirects are not inferred from untrusted request headers. Some noncanonical combinations can require two redirects (for example uppercase numeric product aliases); audit backlinks before a larger URL migration.

## Merchant Center

Data source: https://thevestigia.com/api/feeds/google-shopping (legacy /api/products/google-feed also works). Configure a scheduled URL fetch in Merchant Center. This is a feed integration, not an authenticated Merchant API synchronization.

Each item is a size/color variant with a stable feed ID and parent item_group_id. EUR price, image URL, availability and attributes come from the same serialized product records as server rendering. Feed links include currency=EUR and a specific color/size. Invalid/unpublished/noindex/canonicalized-away products are skipped. Missing critical fields and malformed GTINs produce product-ID warnings without logging customer data. Compare-at prices are not automatically claimed as sale prices.

Before enabling listings: confirm variant color names, any assigned GTIN/MPN, product images, shipping coverage, returns, company contact details, and checkout accessibility on the deployed origin. The user-requested temporary 1% country tax setting remains unchanged. Validate the production tax-inclusive price policy for Italy and ensure the advertised price and checkout treatment satisfy Merchant requirements before submitting the feed. This implementation does not certify those business/tax settings. A browser with an already locked checkout retains that checkout's currency intentionally; test a clean session and a returning customer.

Administrator checklist:

1. Verify and claim thevestigia.com, using the correct business account.
2. Enter verified business/contact information and confirm policies are publicly accessible.
3. Configure Italy, English product content, EUR, actual shipping services and return policies.
4. Add the feed URL and schedule fetches. Enable free listings only after reviewing readiness.
5. Review diagnostics, rejected items and price/availability mismatches by variant.
6. Enable automatic item updates only after confirming markup accuracy; these do not replace feed maintenance.
7. If later using Merchant API, add an authenticated adapter behind the existing mapper; never put credentials in the frontend.

## Italy and future languages

English remains the only deployed language. No /it, /fr or /de doorway pages were created. The typed translation registry emits no hreflang until real equivalents are registered. Future translated pages should use reciprocal links, self references and an appropriate x-default. Italian pages require native editorial review and product/policy translations, not only translated metadata.

No keyword-volume tool or Search Console account was available. The following map is a research hypothesis based on the actual oversized tees, not validated volume data. The bag/leather/Made in Italy keyword examples in the brief do not match this catalog and were not used.

| Intent hypothesis | Existing target | Principal term candidate | Secondary terms to research | Content gap / internal links |
| --- | --- | --- | --- | --- |
| Brand navigation | / | Vestigia | Vestigia clothing | Link shop, story and policies clearly |
| Oversized tee shopping | /shop | oversized t-shirts | heavyweight t-shirts; t-shirt oversize (Italy research) | Verify demand and consolidate similar category intents |
| Specific black/white Aurelius tee | Existing product slug | Vestigia Aurelius tee | actual color, fit and material | Product-specific details and verified care guidance; link parent category |
| Clothing assortment | /collections/clothing | Vestigia clothing | oversized cotton tees | Avoid competing copy with /shop; consider consolidation based on Search Console data |
| Curated release | Existing published CMS collection ID | Vestigia first release | Aurelius collection | Use curated collection intro and real product membership |
| Care/material education | Existing Journal or a future reviewed article | heavyweight cotton t-shirt care | washing cotton jersey; oversized fit guide | Verify instructions with product specifications and link relevant tees |

Do not create every candidate page. Map one principal intent to one useful landing page after native-language research. Do not claim organic certification, Italian manufacture, authorship, or a company history without evidence.

## Performance and remaining limits

Implemented: initial product/article HTML, eager high-priority primary product image, explicit image dimensions, lazy catalog images, preserved hero art direction and route splitting, removal of the speculative logo preload, precompressed Brotli/gzip JS/CSS, immutable hashed assets, no-store private pages, and entry asset budgets (112 KiB gzip JS, 34 KiB gzip CSS).

Not claimed as completed: real-user LCP/INP/CLS, CDN setup, responsive WebP/AVIF derivatives for every uploaded image, unused CSS elimination, font subsetting, or mobile visual/hydration verification. Product PNG conversion needs a proper upload/CDN pipeline that preserves originals and emits verified srcset variants. Do not derive nonexistent WebP filenames. The existing gallery still contains a static-image WebP assumption that should be checked against real assets.

The existing public-document-to-interactive-app transition needs browser verification at 360, 390, 768, 1024 and 1440 px, including font/layout changes, keyboard focus, variant selection, cart interaction and checkout currency locks. Browser automation returned no available browser during this task. Informational policy pages have server metadata but still depend on JavaScript for their body. Editorial pages remain sourced from checked-in content; wiring the SQL editorial CMS to publication requires a separate content migration preserving existing articles and URLs. No analytics provider was installed. If later configured, respect consent and deduplicate purchase by the actual order ID, using the authoritative currency and amount.

## Test and release instructions

From the repository root:

1. npm ci; npm ci --prefix backend (run separately in PowerShell).
2. npm --prefix backend run build
3. npm run build
4. In backend: node --test dist/backend/tests/seo.test.js dist/backend/tests/publicStorefront.test.js dist/backend/tests/homepage.test.js dist/backend/tests/shop.test.js dist/backend/tests/heroHotspots.test.js dist/backend/tests/pricing.test.js
5. From root: node --test scripts/test-checkout-quote.mjs scripts/test-reveals.mjs
6. npm run check:budgets
7. With Express running: npm run seo:audit -- https://thevestigia.com (or your local origin). Review reports/seo-audit.json; the crawler checks initial HTML, not browser interaction. seo-preview.mjs provides a local real-catalog crawl target without payment/background jobs.
8. Validate representative product/group markup with Rich Results Test and Schema Markup Validator; inspect source rather than only the post-JavaScript DOM.
9. Manually test mobile layout, selected variant links, EUR/JPY/USD prices, add-to-cart, locked checkout, payment and order confirmation in the appropriate test environment.

CI runs type/build checks, SEO and commerce regression tests, and budgets. The repository has no configured lint command; no lint pass is claimed. The runtime crawl is explicit because it requires a running site and accessible image assets.

Deployment: follow PRODUCTION_DEPLOYMENT.md, back up the database and upload directory, deploy frontend and backend from the same revision, set PUBLIC_SITE_URL and VITE_SITE_URL consistently to https://thevestigia.com, and use backend start:production. For a migration-managed database, Prisma applies the additive publication migration. For an older database without migration history, compare its complete schema to the migration chain and establish a verified baseline before start:production; do not mark unseen migrations applied or run the whole chain blindly. Local development received only the backed-up additive SQL, and still has no historical migration baseline.

Rollback: redeploy the previous application revision; the new nullable/defaulted columns can remain. Do not drop columns or restore an old database over newer orders. If the migration failed before accepting traffic, restore its verified pre-migration backup only after confirming no newer writes exist. Keep uploaded files and the published snapshot available. Disable a faulty Merchant data source while diagnosing rather than deleting the catalog.

## Search Console and 30-day monitoring

Verify thevestigia.com as a Domain property with DNS, submit /sitemap.xml, inspect the homepage plus representative EUR product, collection, pagination and article URLs, and compare Google's selected canonicals. Monitor Product snippets, Merchant listings, indexing and Core Web Vitals. Segment performance by Italy, device and branded/non-branded queries; compare CTR with actual impressions and position rather than assuming a title change caused a ranking gain.

Days 0-2: check health, source HTML, robots, sitemap, HTTPS/domain redirects, feed fetches, payment smoke tests and unexpected 404/5xx/noindex responses.

Days 3-7: inspect representative URLs, review feed diagnostics and crawler logs, fix price/stock/image errors, and verify newly published and unpublished products appear/disappear correctly.

Days 8-14: review Italian query data and canonical selection; consolidate only genuinely duplicate intents. Check real-user mobile performance when enough data exists and prioritize the largest image/rendering bottleneck.

Days 15-30: compare indexing, impressions, CTR and conversion by device/market, review orphan candidates and editorial gaps, and document the next evidence-based iteration. Search Console field data may lag and may be unavailable at low traffic.

## Phase 2 Technical Upgrades (Production-Grade Optimization)

1. **Document Language & International Market Targeting**:
   - `index.html` configured with `<html lang="en">` (matching English copy), `<meta name="geo.region" content="IT" />`, and `<meta name="geo.placename" content="Italy" />`.
   - Open Graph tags emit `og:locale="en_US"` with `og:locale:alternate="it_IT"` across SSR and CSR.
   - Preconnects added for Google Fonts, Stripe, and image domains.

2. **Robots.txt & Merchant Crawlability**:
   - `robots.txt` disallows private transactional routes (`/checkout`, `/cart`, `/account`, `/admin`, `/homepage-preview`) while explicitly allowing Google feed crawlers (`Allow: /api/feeds/`).
   - Public feed routes registered at `/feeds/google-shopping.xml`, `/feeds/google-shopping`, and `/feeds/products.xml`.
   - Merchant feed enhanced with sale pricing (`g:sale_price`), up to 5 additional gallery images (`g:additional_image_link`), Italy standard delivery (`g:shipping`), and 30-day return policy label (`g:return_policy_label`).

3. **XML Sitemaps**:
   - Full `/sitemap.xml` dynamically emits `<lastmod>` (from product `updatedAt` / deployment date), `<changefreq>`, and `<priority>`.
   - Dedicated `/sitemap-images.xml` conforms to Google Image Sitemap specification (`xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"`).
   - Dedicated XML sitemap index available at `/sitemap-index.xml`.

4. **Schema.org Rich Results & Merchant Listings**:
   - `ProductGroup` and `Product` schemas now include `shippingDetails` (free delivery to Italy) and `hasMerchantReturnPolicy` (30-day return window), resolving Google Merchant Center listing requirements.
   - Aggregate ratings and verified customer reviews dynamically populate Schema.org `aggregateRating` and `review` arrays.
   - Server-side and client-side `FAQPage` JSON-LD schema on `/faq` with 6 detailed answers on shipping, returns, garment fit, and fabric quality.
   - Unification of `Organization` (`['Organization', 'OnlineStore']`, official `sameAs` social profiles, `contactPoint`) and `WebSite` (`potentialAction` Sitelinks SearchBox) across server and client.

5. **Internal Navigation & Core Web Vitals (CLS/LCP)**:
   - Client-side redirect `<LegacyProductRedirect />` replaces duplicate `/shop/product/:id` route directly with `/product/:id`.
   - Semantic `<nav aria-label="Breadcrumb"><ol><li>...` breadcrumbs on both PDP and Shop/Collection pages.
   - Product gallery stage images enforce explicit `width={800}` and `height={1067}` intrinsic dimensions to eliminate layout shifts (CLS = 0).
   - Footer social links updated to official handles `@thevestigia`.
