# Component reveals

`config.ts` owns timing, easing, distances and presets. `Reveal.tsx` uses the existing Framer Motion dependency, with viewport observation and shared mobile/reduced-motion listeners.

```tsx
<Reveal as="section" variant="fadeUp">…</Reveal>
<RevealGroup className="product-grid">
  {products.map(product => <ProductCard key={product.id} product={product} />)}
</RevealGroup>
<RevealText as="h1" split="words">A considered wardrobe.</RevealText>
```

Presets: fade, fadeUp, fadeDown, fadeLeft, fadeRight, scale, blur, imageReveal, textReveal. Use `RevealImage` around media, `RevealModal`/`RevealOverlay` for dialogs, and `useDrawerEntrance` for drawers. Preserve existing semantic tags with `as`. `RevealItem` is available for explicit group children.

Reveals run once per mount by default; `once={false}` opts into repeat viewport reveals. Groups stagger their children without moving the container. Delays are capped at 0.24s for long catalogs. Nested reveals are suppressed unless `allowNested` is explicit. Avoid wrapping entire routes in an entrance animation.

Mobile uses shorter movement and timing. Reduced motion, keyboard focus, print, and missing IntersectionObserver expose content without entrance movement. Image reveals keep the image painted and use a small mask/zoom. Hover interactions remain independent. No global DOM scanning, scroll event loop, loading overlay, or additional animation package is needed.

Applied to storefront sections, products/gallery, cart/checkout, content/policy pages, newsletter/footer, account flows and dialogs. Admin uses `RevealProvider tone="admin"` for restrained headers, cards and panels; table rows remain immediate.

Checks: `node --test scripts/test-reveals.mjs`; production build: `npm run build`. Actual browser scrolling, touch interactions and frame-rate measurements require browser verification.
