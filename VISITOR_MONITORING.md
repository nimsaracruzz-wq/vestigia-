# Visitor monitoring

Open **Admin → Visitor monitoring** after deployment. No Google API, credentials, or analytics subscription is needed. Existing sales reports remain under Analytics.

## What the numbers mean

- Public storefront page views start only after Analytics consent. DNT/GPC opt-outs, admin browsers, private routes, and common bot user agents are excluded. No historical visits are manufactured.
- Live means a visible-page heartbeat received within 90 seconds. The tracker sends every 30 seconds; the admin refreshes every 15 seconds. These are browser sessions, not a verified count of people. A visible but unattended tab can remain active.
- Random browser IDs identify a browser storage profile, not a person. Sessions restart after 30 minutes without a visible heartbeat. Multiple devices, storage clearing, blockers, offline browsers, and denied consent affect coverage. No implementation can promise 100% of human visitors.
- Page views are deduplicated by event ID. Heartbeats do not add views. Daily counts use UTC; summaries refresh every minute or when Refresh reports is pressed.
- The traffic dataset stores random IDs, public pathname, referral hostname, viewport category, and server timestamps. It excludes names, emails, URL queries, and client IP addresses. Records older than 90 days are purged during subsequent collection (hourly check). Backups have their own retention.
- No external analytics script is loaded. Measurement never changes canonical URLs or redirects visitors.
- Direct/no-referrer means no external referring hostname was supplied. It is not proof someone typed the URL. Referrers are counted per page view, not as authoritative marketing attribution.

## Deploy and check collection

The additive migration creates only `TrafficSession` and `TrafficPageView`. The existing `start:production` command runs `prisma migrate deploy` automatically. Back up the production SQLite database before deploying as usual. Do not reset or replace it. No existing business tables are modified.

1. Deploy the frontend and backend builds. The combined Coolify backend application builds and serves both. Use the public HTTPS storefront.
2. Open the storefront in a separate/private browser where you are **not logged in as admin**.
3. Accept analytics in Cookie Preferences, visit a public page, and keep the tab visible. DNT/GPC must not be enabled if you want this test visit to be measured.
4. In your admin browser, open Visitor monitoring. Allow up to 15 seconds for the live update and up to one minute for the summary, or press Refresh reports.
5. Decline analytics or close/hide the storefront tab. The live session expires after 90 seconds without a visible heartbeat; prior page views remain in history.
6. To change analytics consent later, use **Cookie Preferences** in the storefront footer.

## Troubleshooting

- **No recorded visits:** collection starts only after deployment and consent. Test from a non-admin browser, allow requests to the site's API, and check DNT/GPC and browser blockers.
- **Report error:** make sure the backend deployed successfully, the new migration ran, and the admin login is still valid. Errors show the last successful measurement time rather than pretending data is current.
- **Some visitors missing:** consent and client-side collection limit coverage. Do not interpret browser counts as exact people or all server requests.

Google Search Console can still be used separately on Google's website. No connection is part of this feature.
