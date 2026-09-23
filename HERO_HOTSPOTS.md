# Hero product hotspots

Both current campaign shirts are linked to their real catalog products by ID. A backed-up local configuration update restored the two missing references. No prices, titles or inventory are copied into the CMS.

The image and marker layer share one media frame. Image anchors are percentages of the selected source photograph; the existing focal-point settings and actual `object-fit: cover` geometry map those anchors into the visible frame. Desktop, tablet and mobile have independently editable anchors. For the current identical source compositions, their initial source anchors match, but their resulting screen coordinates differ with cropping. This avoids markers drifting as screen height changes. Legacy frame-based percentages remain supported without silently moving existing markers.

In **Homepage → Hero → Product hotspots**, select products, enable/disable markers, drag them in desktop/tablet/mobile previews, or edit percentage fields. The mobile preview offers 375, 390 and 430px widths. The full draft preview also includes hero copy for overlap review. Image changes produce a warning both while editing and when reopening the saved draft before publication.

Markers open an accessible product preview with live market prices, stock, a product link and Quick Add. Quick Add reuses existing variant selection and cart logic. The preview supports Escape, outside-click dismissal, focus trapping and scroll locking.

Run `npm run build` in the backend, then `node migrate-hero-hotspots.mjs` from that folder to restore missing markers on another project-local SQLite database. It backs up the database, checks for the original campaign image and real Black/White Aurelius products, and preserves nonempty hotspot configurations. It does not migrate an unrelated image or manufacture product IDs.

Validation: frontend/backend builds and 13 CMS/hotspot tests pass. Source-photo anchors were visually inspected. Actual browser screenshots and interaction checks remain pending because no in-app browser session was available.
