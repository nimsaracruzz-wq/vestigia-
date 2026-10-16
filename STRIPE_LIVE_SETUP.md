# Live Stripe payments in Coolify

The combined Vestigia application builds the frontend and runs the backend. Configure its environment variables in Coolify. Real payments require an activated Stripe account and the live HTTPS storefront.

## Live keys

1. Open https://dashboard.stripe.com/apikeys in live mode (outside a sandbox).
2. Copy the live publishable key starting `pk_live_`.
3. Create a restricted live key starting `rk_live_`, with **Payment Intents: Write** and **Refunds: Write**. If Stripe groups refund permissions under **Charges and Refunds**, grant that group's Write permission. Payment Intents access must cover creation, retrieval and cancellation. Leave unrelated permissions disabled. This is an application server key, not an autonomous-agent key.
4. Store the restricted key directly in Coolify. Do not paste it in chat or commit it to GitHub.

## Live webhook

In Stripe's live Workbench/Webhooks, add an event destination for **your account**, using:

`https://thevestigia.com/api/stripe/webhook`

Use the actual production domain if different. Select only the events currently handled:

- `payment_intent.succeeded`
- `payment_intent.payment_failed`

Copy that live endpoint's signing secret beginning `whsec_`. A test-mode or Stripe CLI signing secret is not interchangeable with the live endpoint's secret.

## Environment variables

| Name | Value | Build time | Runtime |
| --- | --- | --- | --- |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Full `pk_live_...` key | On | Off |
| `STRIPE_SECRET_KEY` | Full `rk_live_...` restricted key | Off | On |
| `STRIPE_WEBHOOK_SECRET` | Live endpoint's full `whsec_...` secret | Off | On |
| `ALLOW_MOCK_PAYMENTS` | `false` | Off | On |
| `NODE_ENV` | `production` | Keep existing build setting | On |

Keys must belong to the same Stripe account and live environment. Keep server keys and webhook secrets masked and literal (interpolation off). Never put a server secret in a variable starting `VITE_`; only the publishable key belongs in the frontend bundle.

The backend also accepts standard `sk_live_` keys, but a restricted key with only the required permissions is preferred. With either live key type, mock payment IDs are disabled even if ALLOW_MOCK_PAYMENTS was accidentally left true.

## Deploy and check

1. Deploy the reviewed code changes to GitHub, then rebuild/redeploy the combined Coolify application. Restart alone does not replace the frontend publishable key baked into the build.
2. Open `https://thevestigia.com/api/checkout/config`. Confirm `stripeConfigured: true`, `mockPaymentsEnabled: false`, and `issue: null`. This endpoint never exposes keys.
3. Open checkout and confirm the card form loads. If it reports a mode/key mismatch, check both keys and rebuild.
4. Verify delivery results for live webhook events in Stripe Workbench. Plain browser visits to the webhook URL are not a valid signature test: it accepts signed POST requests.
5. Check genuine sales in both Stripe live Payments and Vestigia Orders; amount, currency and payment status must match. Do not treat a return URL or screenshot as payment evidence.

Use Stripe sandbox/test mode to test payment behavior and coupon calculations. Live mode processes real money; do not use Stripe test card numbers or create live payments merely as a test.

No live keys have been stored or live payments submitted by Codex. Actual account activation, live key values, webhook creation and deployment remain owner configuration steps.

Sources: [Stripe API keys](https://docs.stripe.com/keys), [webhooks](https://docs.stripe.com/webhooks), [testing](https://docs.stripe.com/testing).
