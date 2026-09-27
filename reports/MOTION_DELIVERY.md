# Vestigia motion delivery

## 1. Audit and priorities

| Severity | Finding | Resolution |
| --- | --- | --- |
| Critical | Navigation could change the URL without committing the next screen because hidden search filtering repeatedly updated state. | Fixed in the preceding navigation task; regression coverage retained in this task. |
| High | Startup logo overlay remained for at least 650ms and could last 2.5 seconds. | Removed from the application shell. Initial content is available immediately. |
| High | Fullscreen gallery directly reset body overflow even when another overlay owned the scroll lock. | Uses the shared reference-counted scroll lock and dialog focus hook. |
| High | Fullscreen gallery and quick shop unmounted their own presence boundary, preventing exits. | Presence stays mounted; fullscreen renders in a body portal and quick shop presence belongs to the shell. |
| High | Purchase controls used viewport reveals. | Product title/price, description, options and purchase controls now render without entrance hiding. |
| Medium | Reveals took 550–850ms; image reveals used clip-path and 1.06 scale; blur variant animated a filter. | Shorter shared tokens; transform/opacity only; blur callers receive a fade. |
| Medium | Full motion components included projection/layout capabilities for one thumbnail indicator. | `LazyMotion` + `domAnimation` + `m` throughout; removed shared-layout thumbnail projection. |
| Medium | Gallery skeleton looped indefinitely and preload fetched current/next/previous originals on mobile. | Static skeleton, no duplicate current-image preload, next-only mobile preload, no speculative preload on Save-Data/2G. |
| Medium | Header and carousel issued redundant state updates while scrolling. | Header uses requestAnimationFrame and threshold changes; carousel returns existing state until an edge changes. |
| Medium | Quick-shop cart opening waited 650ms. | Cart state and opening now happen immediately. |
| Medium | Gallery thumbnail `scrollIntoView` could move the whole document. | Only the thumbnail strip scrolls horizontally. |
| Medium | A short lazy-route fallback exposed the newsletter/footer, then pushed it offscreen when the page loaded. | Fallback reserves a full viewport; identified with slow-network layout-shift attribution. |
| Low | Scattered easing values, oversized wishlist bounce, broad legacy CSS transitions. | Shared timing, restrained scale, explicit interaction properties in the shared stylesheet. Some legacy CSS remains. |

## 2. Architecture and tokens

The existing `src/animation` architecture is extended, rather than adding a parallel motion directory.

- `MotionProvider.tsx`: synchronous `LazyMotion` with animation/gesture features only, strict checking, global reduced-motion policy and default timing. Synchronous features prevent initially hidden content waiting for a second JavaScript download.
- `config.ts`: typed reveal variants, duration/distance/stagger limits. Durations: 120/180/280/420ms; mobile reveals 220ms; drawers 280ms. Ease: cubic-bezier(.22,1,.36,1). Distances: desktop 16px, mobile/admin 8px. Stagger: 40ms, capped at 120ms in groups of four.
- `Reveal.tsx`: shared section, image, modal and drawer entrances. Reveals default to once; nested reveals are suppressed. Focused content is revealed immediately. Catalog cards already disable reveals.
- `motion.css`: matching CSS timing variables, route/hero entrances, button press feedback, focus rings, product hover and mobile/reduced-motion rules.
- `PageTransition.tsx`: keyed current-page entrance; no retained old route and no exit wait. Route queries remain responsive without remounting the entire page. Checkout and initial entry do not get decorative route motion.

Framer Motion handles presence, drawers, modals, reveals and gallery changes. CSS handles simple hover, press, underline, active states and route entrances. Existing lazy route imports are preserved. `vite.config.js` gives the animation runtime a separately measurable/cacheable chunk.

## 3. Applied behavior

| Surface | Final behavior |
| --- | --- |
| Routes | Navigation commits immediately. Desktop entrance: opacity .65→1 with 8px movement over 280ms. Mobile: short fade. No stale page layers or exit sequencing. |
| Hero | Brief copy entrance; photography remains painted. No splash or forced intro. |
| Product cards | Fine-pointer-only 1.02 image hover, existing secondary-image crossfade, restrained wishlist feedback and immediate active state. Mobile retains visible quick-add controls. |
| Product details | Price/options/purchase controls remain immediately visible. Add updates the cart immediately; confirmation timer is cleaned up on unmount. Accordions inherit the shared timing. Size guide now traps focus, supports Escape and locks scrolling. |
| Gallery | Stable aspect ratio, crossfade, immediate thumbnail selection, horizontal swipe with native vertical scrolling, thumbnail-strip-only scrolling. Fullscreen supports focus restoration and Escape. Zoom follows input directly instead of trailing a spring. |
| Cart and mobile menu | Transform-based 280ms drawer motion and opacity backdrop. Shared focus/scroll hooks remain. Checkout navigation is immediate. |
| Quick shop | Shell-owned exit presence; immediate transition to cart after adding. |
| Filters and sorting | Short CSS panel entrance plus Motion backdrop exit. Portals retain scroll lock until their exiting content unmounts. |
| Editorial and account pages | Existing motion components use the lighter `m` runtime and centralized defaults. |
| Loading | Existing dimensioned catalog skeletons retained; gallery looping shimmer removed; route fallback reserves screen space. |

Native View Transitions and card-to-product shared-element projection were evaluated and deliberately not enabled: this BrowserRouter/lazy-route app can remain responsive with a single current page and a small CSS entrance, without snapshot coordination, retained interactive layers or additional projection code. No scroll-jacking, parallax system, animation dependency, third-party script or payment-flow change was added.

## 4. Accessibility and mobile

`MotionConfig` respects the OS preference, shared reveal helpers zero movement/duration, and the global CSS preference rule includes body portals. Product purchase controls do not depend on animation visibility. Mobile route motion is fade-only, hero image reveal avoids scale, hotspot blur is removed, and icon controls have 44px minimum targets. Native page scrolling remains intact; gallery swipes do not prevent vertical scrolling.

State changes (selected size, filled heart, count, Added label) remain visible with reduced motion. Modal focus/escape handling uses the existing shared hook. The gallery no longer overrides unrelated scroll locks. Smooth scrolling for thumbnail selection and missing-size guidance respects reduced motion.

## 5. Bundle and performance budgets

Measurements use Node gzip on the final production artifacts, rather than the bundler's estimated display sizes.

| Artifact | Gzip bytes | Budget |
| --- | ---: | ---: |
| Entry JavaScript | 97,920 | 114,688 |
| Animation runtime | 30,161 | 36,864 |
| Product detail including gallery | 8,495 | 12,288 |
| Checkout | 17,500 | 22,528 |
| Entry CSS | 30,518 | 34,816 |

Existing hero assets are 89,611 bytes mobile and 203,798 bytes desktop, each below the 512,000-byte budget. Drawer/modal code is included in the entry rather than assigned a misleading standalone size. Gallery code remains within the lazy product page.

The pre-task `dist` snapshot had entry JavaScript 98,660 bytes and the shared Reveal/animation chunk 40,266 bytes gzip. Those two chunks totaled 138,926 bytes, versus 128,081 bytes for the new entry + motion chunks: approximately 10.6 KiB less. This is a comparison against the available prior build, not a controlled clean-worktree benchmark; chunk boundaries changed and the workspace already contained other edits.

`scripts/motion-budget.mjs` enforces the animation, entry, product, checkout and hero budgets. `scripts/performance-budget.mjs` retains the existing general budgets. The browser smoke report samples active browser animations, layout shifts and long tasks; these are diagnostic stress-test measurements, not an FPS, Lighthouse or physical-device battery claim. No extra third-party script is introduced. Stagger is bounded to four items/120ms; the number of visible CMS sections is content-dependent.

## 6. Files

Created:

- `src/animation/MotionProvider.tsx`
- `src/animation/PageTransition.tsx`
- `src/animation/motion.css`
- `scripts/motion-budget.mjs`
- `scripts/motion-smoke.mjs`
- `scripts/motion-loading-check.mjs`
- `reports/MOTION_DELIVERY.md`, `motion-budget.json`, `motion-smoke.json`, and desktop/mobile screenshots.

Behavioral edits:

- `src/App.tsx`, `src/animation/config.ts`, `src/animation/Reveal.tsx`, `src/responsive.css`, `vite.config.js`
- `src/components/layout/Header.tsx`
- `src/components/common/QuickShopModal.tsx`, `CartDrawer.tsx`, `ProductCard.css`
- `src/components/ProductGallery/GalleryAnimations.ts`, `GalleryFullscreen.tsx`, `GalleryImage.tsx`, `GallerySkeleton.tsx`, `GalleryThumbnail.tsx`, `GalleryCounter.tsx`, `GalleryZoom.tsx`, `hooks/useImagePreload.ts`, `hooks/useSwipe.ts`
- `src/homepage/ProductCarousel.tsx`
- `src/pages/ProductDetail.tsx`, `FAQ.tsx`, `Shop.tsx`
- `src/shop/FilterDrawer.tsx`, `SortSheet.tsx`

Lightweight Motion import migration also touches MobileMenu, SearchOverlay, the now-unused Preloader component, and About, Account, Checkout, ContactUs, Journal, Lookbook, PrivacyPolicy, RefundPolicy, ShippingPolicy, Story and TermsOfService. Existing backend/SEO and other uncommitted changes were not part of this motion task.

## 7. Validation and remaining limits

Build/type checks and both bundle budgets pass. Browser regression coverage includes home/shop/collection/product/product-to-product/cart/checkout/account/journal, quick shop, fullscreen gallery, filters/sort, mobile menu, back/forward, direct entry, refresh, rapid page/gallery changes, reduced motion, and a 4× CPU + slow-network journal check. Home, shop, product and checkout are checked for horizontal overflow at 320, 360, 375, 390, 414, 430, 768, 1024 and 1280px. Desktop/mobile screenshots were inspected.

The complete 20-check smoke run is in `motion-smoke.json`. It caught a journal loading shift of roughly 0.38 before the final placeholder correction. The separate `motion-loading.json` records the focused cold-load retest after that correction; `motion-loading-check.mjs` enforces a 0.1 ceiling for that probe. The broad stress run sampled up to 68 concurrent browser animations during viewport resizing (including CSS control transitions); this is diagnostic, not a promise of a universal runtime node cap. Existing whitespace in unrelated `index.html` was reported by `git diff --check` and left untouched.

Run `node scripts/motion-smoke.mjs` with Playwright installed, or set `PLAYWRIGHT_MODULE` to its module URL and `BROWSER_EXECUTABLE` to a local browser executable. `MOTION_BASE_URL` selects dev or production preview. The report records the actual tested URL and completed checks. No orders or payments are submitted by these tests.

Remaining limits: no physical iOS/Android device or battery measurement; synthetic CPU/network throttling is not equivalent to low-end hardware. Pinch/swipe needs real touch-device QA. The smoke test does not exercise live payments or every authenticated account/admin action. Production HTML hydration is a separate backend path from Vite preview and was not re-audited here. Legacy page CSS still contains some broader transitions; changing every unrelated declaration would add unnecessary visual-regression risk. The local in-app browser connection timed out, so validation used a separate headless Edge browser.
