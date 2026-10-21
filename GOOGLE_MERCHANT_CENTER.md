# Google Merchant Center feed

## Feed URL

After the backend change is deployed, use the public scheduled-fetch URL:

`https://thevestigia.com/google-shopping.xml`

The feed is generated from the published product database on each request. It is RSS 2.0 XML with Google's product namespace, uses EUR prices, and emits separate stable offers for each color/size variant. Unpublished products and products without an active EUR price or required feed data are omitted. Stocked variants are `in_stock`; zero-stock variants are `out_of_stock`.

The existing endpoint `/api/products` remains a JSON API. It is not the Merchant Center feed. Legacy feed URLs remain available: `/feeds/products.xml`, `/feeds/google-shopping.xml`, `/feeds/google-shopping`, `/api/feeds/google-shopping`, and `/api/products/google-feed`.

## Add the scheduled fetch in Merchant Center

1. In Merchant Center, open **Settings > Data sources** and add a **Product source**.
2. Choose **Add products from a file** and select **Scheduled fetch**.
3. Set the target country to **Italy**, the feed language to **English**, and the source URL to `https://thevestigia.com/google-shopping.xml`.
4. Choose a daily fetch schedule and save it. The URL is public and does not require credentials.
5. Configure shipping and return settings in Merchant Center to match the store's current policies. The feed deliberately does not claim free shipping on every order or reference an unconfigured return-policy label.
6. Review **Needs attention** and item diagnostics after the first fetch. Feed access does not guarantee approval or placement in Shopping.

This feed advertises EUR prices only. Live product records currently have EUR and USD price rows but no JPY prices, so JPY offers are not generated. Do not add a JPY data source until VESTIGIA has entered valid JPY prices and confirmed their checkout behavior.

## Product identifiers and apparel data

The live catalog currently has no GTIN or MPN values. When neither is present, the feed states `identifier_exists=no`; it never treats the store SKU or internal product ID as a manufacturer identifier. If a manufacturer-assigned GTIN or MPN exists, enter it in product data before feed ingestion. Do not set `identifier_exists=no` for a product that does have an assigned GTIN or MPN.

Apparel variants require usable gender and age group values. Products missing those required fields are excluded from the feed until the catalog is corrected. Color and size values are emitted per variant.

## Audit notes

On 2026-10-21, the live `/api/products` returned HTTP 200 JSON, and `/feeds/products.xml` returned HTTP 200 XML. The catalog contained two published tee products and eight stocked size variants at `14.99 EUR`. Their product pages and primary product images were reachable. The requested `/google-shopping.xml` path returned HTTP 404 before this change. The prior feed omitted `identifier_exists`, made an unconditional `0.00 EUR` shipping claim, and referenced the unverified label `standard_30_days`.

The Merchant Center account and fetch diagnostics were not available during this code audit. Review the account after deployment to identify any remaining product, shipping, returns, or policy warnings.
