# Discount codes

Admin → Marketing creates, enables/disables, and deletes codes. Successful saves are confirmed by the backend; errors stay visible rather than closing the form.

- **Percentage / Products:** percentage off the product subtotal before tax. Applies in all supported checkout currencies.
- **Fixed amount / Products:** a fixed amount off products, valid only in the chosen currency. No exchange-rate conversion.
- **Percentage / Shipping:** percentage off the applicable shipping charge only.
- **Fixed amount / Shipping:** a fixed reduction to shipping in the chosen currency, capped at that shipping charge.
- **Free shipping:** removes the shipping charge in any supported currency. Product prices and the existing tax rules remain unchanged.

Only one code is supported per order. Discounts cannot make their eligible charge negative. Percentage calculations round half up in minor units; JPY amounts must be whole yen, while EUR/USD/GBP use two decimal places. The complimentary-shipping threshold uses the product subtotal after any product discount, before shipping coupons. Shipping already free means a shipping coupon cannot add savings; checkout asks the customer to remove that redundant code instead of consuming a use.

Codes are trimmed and case-insensitive, and must contain 2–40 letters/numbers/hyphens/underscores. Optional expiry dates remain valid through 23:59:59.999 UTC on the selected date. Disabled, expired, exhausted, misconfigured, or wrong-currency codes are rejected on the server. Public visitors cannot download the coupon list. Selecting a code in the bag does not promise a discount amount until the server prices the selected delivery method. Changing code, items, currency, address or delivery invalidates the previous quote.

Uses increment once inside the order transaction, together with the idempotent checkout claim and stock updates. Quotes and validation requests do not increment uses. Payment initialization reserves a coupon slot transactionally, so concurrent checkouts cannot take the same last use. Already-paid checkouts retain the agreed discount even if the code is later disabled, edited, or deleted.

On subsequent payment attempts, reservations older than 30 minutes are checked for abandonment. A slot is released only after a known unpaid Stripe intent is canceled, or payment initialization never delivered a client secret. Processing, successful, or uncertain payments retain their slot. If Stripe is unavailable or cancellation fails, the slot remains reserved until it can be safely checked. Mock payments are handled only when mock mode is explicitly enabled.

The additive migration adds the coupon target and preserves historical shipping amounts. It backfills missing percentage basis points from valid legacy percentage values. Old fixed-amount codes without a currency cannot be safely interpreted: the admin list flags them; disable/delete and recreate with the intended currency and amount. No currency is guessed and historical order totals are not recalculated.

Deploy the combined frontend/backend application. Production startup applies the additive migration. Back up the production database before deploying; no reset or database replacement is needed. Test with a non-admin browser and test payments before running a live campaign.
