# VESTIGIA technical SEO audit

Audit date: 26 September 2026. Scope: the local repository and database. This is a code-level audit; it does not establish what revision is currently deployed, search rankings, crawl coverage, or field Core Web Vitals.

## Initial findings, before changes

| Severity | Finding | Evidence and consequence |
| --- | --- | --- |
| CRITICAL | Product content was client-rendered only | Express rendered home/shop/collections, but product requests received an empty root. Product name, price, availability and schema required JavaScript. |
| CRITICAL | Product schema hardcoded USD | ProductDetail called productJsonLd(product, "USD") even when the customer viewed EUR or JPY. |
| CRITICAL | Invalid offer claims | The schema invented MPNs from product IDs and treated missing inventory as in stock. The interactive size selector assumed 10 units when inventory was missing. |
| CRITICAL | Soft 404s | Express returned the SPA template with 200 for unknown products, collections and arbitrary URLs. Alias redirects existed primarily in client code. |
| HIGH | Merchant pricing fallback | The XML feed preferred USD and otherwise labelled the deprecated floating-point price EUR. It aggregated stock instead of representing sizes/colors. Missing identifiers automatically produced identifier_exists=no without evidence. |
| HIGH | Conflicting sitemap implementations | Express already had dynamic sitemap endpoints, while the frontend build generated another static sitemap. Both emitted current-time lastmod values unrelated to meaningful changes. CMS collections and editorial sources differed. |
| HIGH | Invented entity/localization data | index.html declared a legal company name and social profiles without a verified configuration, plus language URLs that have no router implementation. |
| HIGH | Publication was not modelled | robotsIndex existed, but no separate product publication switch or product modification timestamps existed. |
| MEDIUM | Catalog metadata and pagination | Initial collection titles were all Shop. Query handling noindexed every query indiscriminately. The interactive shop already had crawlable Load more links, but canonicalized page 2 to page 1; initial HTML stopped at 48 products. |
| MEDIUM | Slug stability | Server fallback regenerated slugs on name updates; accented characters were inconsistently handled between admin, frontend and backend. Existing redirectFrom data needed HTTP redirects. |
| MEDIUM | Editorial mismatch | The public Journal reads the checked-in src/data.ts articles; the admin Journal writes SQL. The original dynamic sitemap used SQL articles, creating potentially nonexistent public destinations. |
| MEDIUM | Image and rendering cost | Hero art direction and dimensions exist. Uploaded product PNGs lack a responsive image transformation pipeline. The initial document is hydrated and then replaced by the interactive app; layout continuity requires browser testing. |
| MEDIUM | Missing automated acceptance gate | No SEO HTTP/schema regression suite, crawl report or asset-size CI budget existed. |
| LOW | Speculative hints and metadata | The logo was preloaded without LCP evidence. Unsupported social handles and unnecessary keywords were emitted globally. |

## Architecture reviewed

React 19 and React Router provide the storefront and admin UI. Vite builds route-split JavaScript and CSS. Express 5 serves APIs and production HTML. Prisma and better-sqlite3 use SQLite; product prices are integer minor units per currency and inventory is keyed by product/color/size. Homepage CMS sections supply curated collections and their copy/order. Categories and product types are product fields, not independent SQL entities.

Existing capabilities retained: published homepage snapshots, responsive hero sources, immutable hashed asset caching, route splitting, price-list validation, checkout snapshots, Stripe validation, server stock checks, consent UI, admin authentication, and shipping/returns/contact/policy routes.

No analytics or marketing tracker integration was found; the consent UI explicitly states that none is loaded. Stripe is used by checkout. Google Fonts uses display=swap. No production CDN configuration or real-user performance dataset was available for verification. Earlier entry asset measurements were approximately 99 KB gzip JavaScript and 30 KB gzip CSS; these are bundle measurements, not LCP/INP/CLS.

The local database contains two catalog products. It had no Prisma migration table. The additive product-publication SQL was backed up and applied locally without pretending the historical migrations had been run. See SEO_IMPLEMENTATION.md before deploying an unbaselined database.

## Research used

- [Google product variant structured data](https://developers.google.com/search/docs/appearance/structured-data/product-variants): variant URLs must select the advertised variant; one canonical can represent a single-page product group.
- [Merchant product data specification](https://support.google.com/merchants/answer/7052112?hl=en-GB): website/feed price, currency and availability must agree; identifiers cannot be invented.
- [Identifier exists](https://support.google.com/merchants/answer/6324478?hl=en): missing database fields are not evidence that no identifiers were assigned.
- [International sites](https://developers.google.com/search/docs/specialty/international/managing-multi-regional-sites): localized equivalents must actually exist.
- [Ecommerce URL design](https://developers.google.com/search/docs/specialty/ecommerce/designing-a-url-structure-for-ecommerce-sites): stable URLs and discoverable variant/pagination links.

Remaining verification and intentionally deferred work are listed explicitly in SEO_IMPLEMENTATION.md. No ranking or rich-result guarantees are made.
