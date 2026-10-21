# VESTIGIA SEO project deliverables

## Audit basis and limitations

Reviewed the repository, existing `SEO_AUDIT.md` and `SEO_IMPLEMENTATION.md`, and saved local crawl report `reports/seo-audit.json` (21 checked URLs, zero recorded crawl errors, nine information routes without an initial HTML H1). The crawl report is dated 26 September 2026 and describes a local environment; it does not establish current production behavior. Direct production fetches were inaccessible during this review. The repository's checked-in seed catalog contains two Aurelius oversized T-shirts, black and white; live database product data must be checked before final copy or feed submission. No Search Console or keyword-volume account was available.

## Prioritized audit

| Severity | URL/component | Issue and impact | Fix | Verification |
|---|---|---|---|---|
| Critical before publishing claims | Homepage CMS, About, Story, FAQ, Journal, product detail | Repo contains Italian design/origin, Sri Lankan manufacture, ethical sourcing, organic cotton, GSM, luxury studio and quality promises with no supporting records in the audit. Conflicts reduce trust and may cause feed/policy mismatches. | Confirm claims against business/supplier/product records; remove unsupported assertions consistently in CMS and app copy. Some default metadata and FAQ claims were corrected in this change. | Compare public text to approved business facts and live catalog. |
| High | SSR Organization and WebSite JSON-LD; `SEOHead` | Unverified social profiles and Italian availability; English pages set `og:locale=it_IT`; WebSite SearchAction was declared without need. | Removed unverified `sameAs`, aligned locale to `en_US`, removed alternate Italian locale, and removed unsupported SearchAction. | Inspect raw and hydrated HTML; validate JSON-LD with Schema Markup Validator. |
| High | `/faq` and SSR FAQ schema | Unsupported shipping origin, delivery/courier, return, organic cotton and GSM statements. | FAQ answers now point customers to live policy, checkout and product details rather than making unverifiable promises. | Compare visible FAQ and JSON-LD against policies and product details. |
| Medium | `/about`, `/story`, `/lookbook`, `/contact`, `/faq`, policies | Saved crawl found zero H1 in initial HTML for nine information pages; body may require JavaScript. | Add one meaningful H1 and assess server rendering/static HTML for important trust pages. Avoid framework migration absent evidence. | Fetch raw production HTML with JS disabled; check status, title, canonical, H1 and main body. |
| Medium | `/shop`, `/collections/*`, product pages | Actual checked-in catalog is only two oversized tees; no evidence for hoodies, sweatshirts or other proposed categories. Live specifications may differ. | Focus query mapping on current products and preserve current URL patterns; enrich product facts from live data. | Compare production catalog, canonical URLs, internal links, JSON-LD and Merchant feed variants. |
| Medium | `/robots.txt`, `/sitemap.xml` | Runtime Express owns production SEO endpoints; checked-in static sitemap is intentionally empty. Deploying only `dist` would break sitemap behavior. | Deploy matching frontend/backend; verify live endpoints before Search Console submission. | HTTP fetch robots and sitemap; each sitemap URL must be canonical, indexable and return 200. |
| Medium | Images/performance | Prior audit has no real-user CWV data, notes product PNGs without responsive transforms and a suspected nonexistent WebP assumption. | Measure actual mobile experience; add image derivatives only through a real pipeline with verified output files. | PageSpeed/CrUX and mobile browser checks; inspect LCP/INP/CLS and image URLs. |
| Low | Keyword demand and rankings | No actual volume, difficulty or Search Console baseline was available. | `reports/vestigia-keyword-map.csv` marks unknown values; use Search Console and Keyword Planner/selected SEO provider to fill them. | Record source, date, target country and query metrics. |

## Recommended site tree and mapping

Preserve current structure: `/` home; `/shop` all products; `/collections/{slug}` category/CMS collections; `/product/{slug}` product pages; `/about`, `/story`, `/lookbook`, `/journal`, `/contact`, `/faq`, `/shipping-policy`, `/refund-policy`, `/privacy-policy`, `/terms-of-service`. Do not create duplicate Shopify-style URLs. Keyword-to-URL mapping is in `reports/vestigia-keyword-map.csv`; it only includes actual catalog terms and marks monthly volume/difficulty Unknown. Italian queries remain research-only pending market and brand identity confirmation.

## Metadata and content recommendations

| URL | Title | Meta description | Page direction |
|---|---|---|---|
| `/` | VESTIGIA \| Contemporary Clothing & Oversized T-Shirts | Explore VESTIGIA contemporary clothing, including Aurelius oversized T-shirts in black and white. Discover the first release. | Identify brand and products, then link to Shop, products, About and Contact. |
| `/shop` | The First Release \| VESTIGIA | Shop the VESTIGIA first release, featuring Aurelius oversized T-shirts in black and white. | Brief unique intro; link all current products. |
| `/product/vestigia-aurelius-oversized-tee-black` | VESTIGIA Aurelius Oversized Tee - Black \| VESTIGIA | Explore the black VESTIGIA Aurelius oversized tee. View available sizes, current price, fit, fabric and delivery details. | Verified material/GSM, fit, care, stock and variant prices. |
| `/product/vestigia-aurelius-oversized-tee-white` | VESTIGIA Aurelius Oversized Tee - White \| VESTIGIA | Explore the white VESTIGIA Aurelius oversized tee. View available sizes, current price, fit, fabric and delivery details. | Same synchronization requirements as black SKU. |
| `/collections/clothing` | Clothing \| VESTIGIA | Explore contemporary clothing from VESTIGIA, including oversized Aurelius T-shirts. | Keep only if meaningful and distinct from `/shop`. |
| `/collections/new-arrivals` | New Arrivals \| VESTIGIA | Discover the latest VESTIGIA clothing and new releases. | Keep when actively maintained with current products. |
| `/collections/first-release` | The First Release \| VESTIGIA | Explore the VESTIGIA first release and its Aurelius oversized T-shirts. | Match actual collection membership. |
| `/about` | About VESTIGIA | Learn about VESTIGIA and explore the contemporary clothing collection. | Verifiable story and clear H1; no unsupported origin claims. |
| `/contact` | Contact VESTIGIA | Contact VESTIGIA for product, sizing and order support. | Accessible, verified support details. |
| `/faq` | VESTIGIA FAQs \| Orders, Sizing & Delivery | Find answers about VESTIGIA product sizing, orders, delivery and returns. | Answers must match policies and catalog. |
| `/journal` | VESTIGIA Journal \| Product & Style Guides | Read VESTIGIA stories and practical guides to oversized T-shirts and clothing care. | Publish only accurate, original, useful content. |

Product template: unique product name; visible verified description, composition, GSM, fit, measurements, sizes/colors, care, current price/availability and policy links; accurate image alt text; Product/ProductGroup JSON-LD sourced from the same catalog/feed values. Do not invent identifiers, ratings or reviews.

Homepage copy direction: “VESTIGIA creates contemporary clothing shaped by considered silhouettes and distinctive details. Explore the Aurelius oversized T-shirts in black and white.” Confirm with current live products and brand voice before publication.

## Technical SEO and schema report

Existing capabilities documented in repo: Express initial HTML for home/shop/products/collections; Product schema and breadcrumbs; runtime robots/sitemap; canonical and noindex policies; EUR Merchant feed; route handling and prior local crawl. These were not independently production-verified here. JSON-LD changes in this turn remove unverified social IDs, Italian support language and SearchAction. Validate live Product/ProductGroup markup using Rich Results Test and Schema Markup Validator after deployment.

Robots source permits general crawling, excludes admin/transactional paths, permits feed URLs, and points to `/sitemap.xml`. `public/sitemap.xml` is an empty placeholder by design. Do not submit the placeholder; verify the Express production endpoint first.

## 90-day execution roadmap

| Days | Actions | Measures |
|---|---|---|
| 0–14 | Verify legal/business identity, origin/design/manufacturing, SKU materials/GSM, social URLs, shipping/returns and target markets. Check production redirects, robots, sitemap, canonicals, status codes and product pages. | HTTP/HTML checks, sitemap processing, Merchant feed diagnostics. |
| 15–30 | Review Search Console queries/index coverage; reconcile product title/image/variant/price/stock parity; address initial HTML H1/body gaps on key trust routes. | Branded impressions/clicks, indexed URLs, product listing diagnostics. |
| 31–60 | Populate keyword map from real query/Keyword Planner data; improve useful collection/product content; measure mobile performance; draft one reviewed styling/care article if relevant. | Query CTR by page/device/country; CWV when field data exists; organic product engagement. |
| 61–90 | Pursue relevant editorial/creator coverage; link verified official profiles; assess content and organic sales; consolidate pages only with evidence. | Non-branded clicks, qualified sessions, product conversion and referral quality. |

## Measurement dashboard specification

Use Search Console Search Results, Pages/Queries/Countries/Devices, Indexing Pages and Sitemaps; Merchant Center diagnostics; GA4 only after consent/privacy review and purchase deduplication by order ID. Dimensions: date, page, query group (brand/nonbrand), country, device, product/collection and currency. Metrics: impressions, clicks, CTR, average position (context only), indexed/canonical URLs, sitemap errors, product appearance impressions, organic sessions, product views, add-to-cart, purchases, revenue and conversion rate. Export the preceding 90 days as a baseline and annotate deployment date; account access was unavailable here.

## Changes and remaining access

Repository changes: updated default homepage metadata; aligned English social locale; removed unverified social links from Organization schema; removed alternate Italian locale and unsupported SearchAction; revised FAQ text/schema; simplified About metadata; added keyword map and this report. `npm run build` passed. Changes are local and not deployed.

Owner confirmation needed before final public claims: Italian-founded/designed/inspired status; manufacturing/origin; organic/material/GSM per live SKU; official social URLs; shipping origin/carriers/timelines, return window and contact details; target countries/languages. Production access or reachable site required for a live crawl; Search Console/GA4/Merchant Center access required for indexing, analytics and feed account work. Keyword volume and difficulty require Search Console and/or Keyword Planner/SEO data provider.
