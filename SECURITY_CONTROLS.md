# Security and error recovery

API failures include an `X-Request-ID` response header and a matching `requestId` in JSON errors. Support can correlate these with structured `request_failed` and `request_exception` events. These events omit bodies, query strings, credentials, and database exception text. Existing route-specific console logging has not been comprehensively replaced.

Malformed JSON, oversized payloads, upload errors, conflicts, missing records, temporary database failures, and unexpected exceptions receive safe responses. JSON request structures are bounded to 16 nesting levels and 10,000 nodes and reject prototype-pollution keys. A React error boundary provides a recovery page. Customer JWTs use HS256 and cannot use admin identities; existing database-backed sessions and CSRF protections remain active.

Authentication, checkout, forms, and admin-write budgets are shared across related endpoints. Each limiter holds at most 10,000 IP buckets and clears expired buckets. The general API budget is 600 requests per minute per IP. Limits are process-local; multiple production instances require a shared limiter store. A limiter restart resets its budgets.

`TRUST_PROXY` defaults to `loopback`, suitable for local Vite proxying. Configure it for the actual trusted production proxy network; `TRUST_PROXY=1` is appropriate only where every request passes through exactly one trusted proxy and direct backend access is blocked. Do not trust arbitrary forwarded IP headers.

Recovery never automatically repeats payment, account creation, order submission, or other writes. GET account requests time out after 15 seconds. Unexpected render failures preserve stored cart data and offer reload/home actions.

Validate with `npm.cmd --prefix backend run build`, then `node --test backend/dist/backend/tests/requestSafety.test.js`. These tests use an isolated HTTP server and no customer database or outgoing email.

This is a concrete hardening layer, not an AI intrusion detector or a complete penetration test. Production still requires TLS, protected secrets, dependency maintenance, monitored logs, backups, and deployment-specific verification.
