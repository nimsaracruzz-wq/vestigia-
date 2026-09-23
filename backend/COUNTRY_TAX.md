# Country percentage tax

Shipping countries default to **1%**, as requested. Admin → Shipping → Countries → Edit exposes the percentage. Values from 0 to 100 with two decimal places are supported. Zero is tax-free; an explicitly blank rate uses the existing market rate.

The server calculates tax on merchandise after discounts, excluding shipping, with integer minor-unit rounding. The quote, payment amount, order and receipt use the same snapshot. Changing a rate invalidates an unpaid quote; historical paid amounts remain unchanged. Shipping export/import includes the rate in basis points (100 = 1%).

`prisma/migrations/20260923000000_country_tax_rules/migration.sql` adds the nullable rate with a 100-basis-point default. For this existing local SQLite workspace, run `node migrate-country-tax.mjs` from `backend`; it backs up the database, adds only this column, and preserves previously migrated rates on repeat runs. This is needed because older local schema migrations are not fully represented in the Prisma migration ledger. Do not reset the database to apply this change.

Validation: build with `npm run build` in `backend`, then `node --test dist/backend/tests/pricing.test.js`. Frontend quote invalidation checks: `node --test scripts/test-checkout-quote.mjs` from the project root. Live Stripe authorization and browser checkout remain separate manual verification steps.
