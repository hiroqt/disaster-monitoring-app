# PH Disaster Monitoring App — Security & Scalability Guide

Companion to the architecture guide. Covers how to harden and scale the same system as usage grows, especially during high-traffic events (active typhoons, major earthquakes) when both load and the consequences of bad data are highest.

## 1. Threat model specific to this app

A disaster monitoring app has a few risks that a typical CRUD app doesn't:

- **False alerts cause real harm.** A spoofed or buggy "magnitude 7 earthquake" push notification can trigger panic or unsafe evacuation behavior.
- **Traffic spikes correlate with the disaster itself.** Usage surges exactly when infrastructure (cell towers, power, your servers) is most likely to be degraded.
- **Crowdsourced data (accident reports) is an open input channel** — the easiest place for abuse, spam, or manipulation.
- **Location data from users is sensitive** even if the app's purpose is public safety.

Design decisions below are organized around these four risks.

## 2. Data integrity (preventing false alerts)

- **Never push a notification directly from a raw scrape.** Every ingested record passes through the normalizer and a validation step before it can trigger a push.
- Validation rules per hazard type, e.g.:
  - Earthquake: magnitude must fall in a plausible range (reject magnitude 0 or >10 as parser errors, not real events).
  - Coordinates must fall within Philippine bounding box (roughly 4°N–21°N, 116°E–127°E) — reject or flag anything outside.
  - Timestamp must not be in the future or absurdly old (catches timezone parsing bugs — PH sources use PST/UTC+8, easy to get wrong).
- **Cross-check where possible.** If GDACS/USGS and PHIVOLCS both report the same quake within a tolerance window, mark it as confirmed; if only one source has it, mark as unconfirmed and consider delaying the push or labeling it clearly.
- **Kill switch.** Keep an admin-only endpoint or flag to immediately suppress a specific alert or pause all pushes, in case a bad parse slips through.
- **Audit trail.** Keep `raw_payload` and a log of every push sent (what, when, to how many users) so a bad alert can be traced and explained after the fact.

## 3. Securing the ingestion layer

- Scrapers should run in an isolated worker/service, not inside your main API process — a scraping failure or a malicious response from a compromised source shouldn't be able to touch your core API.
- Set strict timeouts and response size limits on every fetch — a hung or oversized response from a government site shouldn't be able to stall your job queue.
- Treat scraped HTML as untrusted input: parse with a proper HTML parser (not regex), never `eval` or execute anything from a response, sanitize before storing.
- Rate-limit your own scrapers against each source (don't hammer PAGASA/PHIVOLCS) — be a good citizen and avoid getting your IP blocked, which would take down a whole hazard category for all your users at once.

## 4. Securing the crowdsourced accident reports

This is your highest-risk input surface since it accepts arbitrary user data.

- **Authentication**: require at least lightweight auth (anonymous device ID at minimum, phone/email verification ideally) before a report can be submitted — fully anonymous, unauthenticated write access invites spam and abuse.
- **Rate limiting per user/device**: cap submissions per hour to prevent flooding.
- **Moderation queue by default**: reports are not public until approved, or are shown as "unverified" with a visibly different UI state.
- **Input sanitization**: strip/escape all free-text fields before storage and before rendering on map/web (prevents stored XSS on the web dashboard).
- **Image uploads**: validate file type and size server-side (not just client-side), strip EXIF location metadata unless you intend to use it deliberately, scan for malware if you accept arbitrary uploads.
- **Geofencing sanity check**: reject submissions with coordinates far outside the Philippines or impossible accuracy (e.g. 0,0).
- **Duplicate/spam detection**: flag multiple reports from the same device within a short time/distance window for manual review.

## 5. API security

- **HTTPS everywhere**, no exceptions, including between internal services if they cross network boundaries.
- **Authentication for write endpoints** (report submission, admin actions); read endpoints for public hazard data can stay open, but still rate-limited.
- **API keys or tokens for the Flutter/web clients**, rotated periodically, not hardcoded in client source (use environment-based config and a secrets manager).
- **Rate limiting and basic DDoS protection** at the edge (e.g. Cloudflare free tier, or your hosting provider's built-in protection) — public safety apps are also more likely to be targeted or to receive legitimate-but-massive spikes that look like attacks.
- **Input validation on every endpoint**, not just the obviously risky ones — query parameters (`region`, `type`, date ranges) should be validated against an allowlist, not passed straight into a database query.
- **Parameterized queries / ORM only** — never string-concatenate user input into SQL, especially important since this app accepts free-text user reports.
- **CORS configured explicitly** for your web dashboard's domain, not `*`.

## 6. Secrets and infrastructure

- No credentials, API keys, or database connection strings in source control — use environment variables and a secrets manager (e.g. your cloud provider's built-in one, or something like Doppler/Vault).
- Separate credentials per environment (dev/staging/prod) so a leaked dev key can't touch production data.
- Principle of least privilege: the scraper service shouldn't have write access to user-report tables; the moderation admin panel shouldn't have access to raw scraper credentials.
- Keep dependencies updated — `pub.dev` packages on the Flutter side and backend dependencies are both worth automated vulnerability scanning (Dependabot or similar, free for public/most private repos).

## 7. Privacy

- Minimize what you collect from users. You likely don't need precise persistent location history — request location only when needed (submitting a report, centering the map) rather than tracking continuously in the background.
- If you do store user location (e.g. for "alerts near me"), state this clearly in-app and let users opt out or use a manually-set region instead of GPS.
- Comply with the Philippine Data Privacy Act of 2012 — have a clear privacy policy, a data retention policy (don't keep raw user data indefinitely), and a way for users to request deletion of their submitted reports.
- Don't expose other users' precise submission locations or device identifiers in API responses, even to other authenticated users — aggregate or fuzz where the precise point isn't needed.

## 8. Scalability

### 8.1 Expect uneven load
Traffic will be flat most of the time and spike hard during active typhoons or major earthquakes. Design for the spike, not the average.

- **Stateless backend API** so you can horizontally scale (add more instances) during a spike — don't keep session state in process memory.
- **Cache aggressively** for read-heavy endpoints. Hazard data doesn't change every second; a 30–60 second cache (Redis or CDN edge cache) on `GET /hazards` dramatically cuts database load during a spike, since most users are reading the same data simultaneously.
- **Queue-based ingestion**: put scraped data onto a queue (e.g. a managed pub/sub) rather than writing directly to the database from the scraper, so a database slowdown doesn't back up your scrapers.
- **CDN for static assets** (map tiles, app icons, web dashboard static files) so your origin server only handles API traffic.

### 8.2 Database scaling
- Index early on `hazard_type`, `region`, `timestamp`, and geo-columns — these are the filters every query will use.
- Partition or archive old data (e.g. resolved hazards older than X months) into a separate table or cold storage, keeping the "active hazards" table small and fast.
- Use read replicas if read traffic (map views, public API) starts to compete with write traffic (ingestion, user reports) — reads can be served from a replica while writes go to primary.

### 8.3 Push notifications at scale
- Push delivery (FCM or similar) is itself a potential bottleneck during a mass-alert event — batch sends and use topic-based subscriptions (e.g. subscribe by region) rather than sending to every device individually, so a regional flood alert only reaches users who opted into that region.
- Have a fallback/degraded mode: if push delivery is delayed or failing, the app should still show the alert prominently on next open, not depend solely on the push arriving.

### 8.4 Graceful degradation
- If a single hazard source (e.g. PHIVOLCS scraper) is down, the rest of the app should keep functioning — don't let one failing ingestion job take down the whole API.
- Health checks per source, surfaced in an admin dashboard, so you know which feeds are stale before users notice.
- Client-side: show "last updated X minutes ago" rather than failing silently or showing a blank screen when the backend is slow or temporarily unreachable.

## 9. Pre-launch checklist

- [ ] All write endpoints require authentication
- [ ] Rate limiting in place on read and write endpoints
- [ ] Crowdsourced reports go through moderation before becoming public
- [ ] Push notifications only triggered after validation, with a kill switch available
- [ ] HTTPS enforced everywhere
- [ ] No secrets in source control
- [ ] Privacy policy published, data retention policy defined
- [ ] Caching in place for high-read endpoints
- [ ] Health checks per data source
- [ ] Tested behavior when a single source/scraper fails
- [ ] Tested behavior under simulated traffic spike