# Shop and collections

The shop uses the shared product catalog, currency prices, cart and wishlist. Mobile shows two columns; tablet shows two or three; desktop from 1280px shows four. Products use 4:5 media, with Quick Add below the information on touch screens and a size-selection action on hover or keyboard focus on desktop.

The former full-height grid container and editorial footer have been removed. The shared newsletter follows the catalog with normal section spacing. The route is lazy loaded, reserves image space, loads later images lazily and renders products in batches.

## Administration

Open **Homepage → Shop & collections** to edit the intro, default collection, page size and visibility of navigation, count, filters, sort, wishlist and Quick Add. Save Draft and Publish use the existing CMS workflow. Existing saved configurations receive defaults without a database migration.

Enabled product carousel sections also define `/collections/{section-id}`. Their title, description, manual ordering, source and exclusions are shared with the homepage. Category routes use real catalog categories and product types. The homepage display limit does not restrict manual/category collection membership in the shop. Best sellers use the existing paid-order feed (currently capped at 24).

Filters support size, color, availability and market-specific price ranges. Size/color stock checks apply to the same variant. URL parameters preserve filters and sort, and load-more preserves scroll. Price ranges are tagged with their currency and ignored in another currency. Featured preserves the collection order; newest uses descending catalog IDs because products do not expose a creation timestamp.

## Verification

Frontend and backend production builds pass. Six shop tests cover currency sorting, variant stock combinations, featured order, exact price limits, URL state and CMS defaults/validation. Existing CMS/pricing and checkout/animation checks also pass (37 tests total).

Browser visual and interaction verification remains pending: no in-app browser was connected. The catalog still uses the existing shared full-catalog request; Load More limits rendered cards, not the API payload. Cart and wishlist remain on their existing shared context; automated checks do not replace browser testing of those interactions.
