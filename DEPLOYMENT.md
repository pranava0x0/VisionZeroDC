# DEPLOYMENT.md — Hosting decision (Workstream C)

> Written 2026-07-09 as the deliverable for PLAN.md Milestone M8.
> This is a **decision doc, not a migration**. The conclusion is: stay on GitHub
> Pages now; move to Cloudflare Pages only when a specific, pre-registered trigger
> fires. Nothing in the current setup forces a move today.

---

## Current setup (baseline)

Vision Zero DC is a static, build-step-free site served from the repository root:

- **Host:** GitHub Pages, deployed by `.github/workflows/deploy.yml`.
- **Deploy gate:** every push/PR runs `node --test` (JS unit tests) plus the two
  Python pipeline tests; **deploy runs only after tests pass and never from a
  pull request** (`if: github.event_name != 'pull_request'`).
- **Data cadence:** `.github/workflows/refresh-data.yml` opens weekly data-refresh
  PRs; those PRs are gated by the same test job before they can merge and deploy.
- **Assets:** vanilla HTML/CSS/JS, Leaflet from CDN with Subresource Integrity
  (SRI), baked JSON files (each ≤ ~133 KB), `.nojekyll` to serve files verbatim.
- **Machine-readable index:** `llms.txt` / `llms-full.txt` at the root.

This already satisfies the CLAUDE.md architecture principles: static-when-possible,
pipeline-first, cost-conscious, idempotent, test-gated. There is no product need
today that GitHub Pages fails to meet.

---

## C1. Decision matrix

Static-host options compared on the criteria that actually matter for this project.
Cost/limit figures are the publicly documented free-tier terms **as understood at
time of writing; re-verify against each provider's current docs before relying on a
number** — provider limits drift and are not a primary source.

| Criterion | GitHub Pages (current) | Cloudflare Pages | Netlify | Vercel |
| --- | --- | --- | --- | --- |
| Cost at this scale | Free | Free | Free tier | Free tier (non-commercial) |
| Custom HTTP headers (CSP, cache-control) | ❌ none | ✅ `_headers` file | ✅ | ✅ |
| Redirects / rewrites | ❌ meta-refresh only | ✅ `_redirects` | ✅ | ✅ |
| Bandwidth / soft limits | ~100 GB/mo soft, ~1 GB site cap | Generous free tier | ~100 GB/mo free | ~100 GB/mo free |
| Edge functions / API proxy later | ❌ | ✅ Workers | ✅ Functions | ✅ Functions |
| CI already wired | ✅ (Actions → Pages) | needs port | needs port | needs port |
| Custom domain + HTTPS | ✅ | ✅ | ✅ | ✅ |
| Vendor lock-in risk | Low (static artifact) | Low (static artifact) | Low–med | Med (framework pull) |

The only rows where GitHub Pages loses are **custom headers**, **redirects**, and
**edge/server logic**. None of those is needed by the current site.

---

## C2. Recommendation (pre-registered)

**Stay on GitHub Pages.** Move to **Cloudflare Pages** — and only Cloudflare Pages,
because it is the closest fit (static-first, free, adds headers/redirects/Workers
without adopting a framework) — when **any one** of these triggers fires:

1. **Real HTTP headers are needed.** The two concrete cases: (a) a strict
   Content-Security-Policy once third-party embeds grow beyond the current
   SRI-pinned Leaflet CDN; (b) long-cache `Cache-Control` headers for
   `data/*.json` once those files get content-hashed / busted names. GitHub Pages
   cannot set either; Cloudflare Pages does it with a committed `_headers` file.
2. **A server-side need appears.** The map's biggest latency source is *live
   ArcGIS queries* from the browser. The first real backend this project is likely
   to want is a cached edge proxy in front of the DC ArcGIS host (cuts latency and
   shields against upstream rate limits). That is a Cloudflare Worker — a day of
   work, not a framework migration.
3. **Bandwidth pressure.** Unlikely at current sizes (baked JSON is small, no
   media), but if Pages soft limits are ever approached, Cloudflare's CDN is the
   escape hatch.

Until a trigger fires, migrating would add operational surface (a second host, DNS
cutover, CI port) for no user-visible gain — which violates the cost-conscious and
"ship the smallest useful version" principles.

### Explicitly *not* recommended

- **Netlify / Vercel** as the fallback. Both work, but Vercel's free tier is
  non-commercial and pulls toward its framework/build model; Netlify offers no
  decisive advantage over Cloudflare for a static-first site. Concentrating the
  fallback on one well-fitting target (Cloudflare Pages) keeps the migration
  runbook short and rehearsed.

---

## C3. Migration runbook (so the move is a day, not a project)

Keep this current so a triggered move is mechanical:

1. **Build parity.** No build step exists; Cloudflare Pages can deploy the repo
   root directly (framework preset: "None", output dir: `/`). Confirm `.nojekyll`
   behavior is irrelevant there (Cloudflare serves files verbatim; no Jekyll).
2. **Keep the test gate.** Port the `test` job from `deploy.yml` — either keep
   running `node --test` + the Python tests in GitHub Actions and let Cloudflare
   deploy on green, or replicate the gate in Cloudflare's build command. The gate
   must not be dropped: test-gated deploy is a project invariant.
3. **DNS.** Point the custom domain (or `*.pages.dev`) at Cloudflare; enable HTTPS.
4. **Headers/redirects.** Add `_headers` and `_redirects` only for the capability
   that triggered the move — don't add speculative rules.
5. **Preserve invariants across the move:**
   - `llms.txt` and `llms-full.txt` stay at the root and stay accurate.
   - The weekly `refresh-data.yml` PR flow keeps working (it commits JSON to the
     repo; the host just redeploys — no change needed to the refresh pipeline).
   - SRI-pinned CDN assets stay pinned.
6. **Rollback.** Because the artifact is a plain static tree in git, reverting to
   GitHub Pages is re-enabling the existing workflow and repointing DNS. Keep
   `deploy.yml` in the repo (disabled, not deleted) after any migration.

---

## Decision log

| Date | Decision | Rationale |
| --- | --- | --- |
| 2026-07-09 | Stay on GitHub Pages; Cloudflare Pages pre-registered as the move target | No current need for headers/redirects/edge logic; existing CI+Pages meets all architecture principles. Triggers documented above. |

Revisit this doc whenever a trigger condition is approached, or when the site gains
its first server-side dependency.
