# Testing — Week 4 (Performance & Accessibility)

## Environment

| Item | Version / detail |
|------|------------------|
| OS | macOS (Darwin 27.0) |
| Node.js | 26.8.2 |
| Browser | Google Chrome 156 (headless), used by Lighthouse, axe and the tests |
| Lighthouse | 13.5.0 via the Node API (`scripts/audit.mjs`) |
| axe-core | 4.14.0, rule sets `wcag2a, wcag2aa, wcag21a, wcag21aa, wcag22aa, best-practice` |
| Validators | html-validate 11.17.0 (`.htmlvalidate.json`), csstree-validator 4.0.1 |
| Server (local audits) | `scripts/serve.mjs` on 127.0.0.1: gzip for HTML/CSS/JS/SVG, `Cache-Control: no-cache` |
| Hosting (public tests) | GitHub Pages, `https://takshaksinghania.github.io/frontend-internship-week4-performance-accessibility/` (taken offline 23 October 2026 after testing) |
| WAVE | wave.webaim.org web interface, run against the hosted pages |
| WebPageTest | webpagetest.org anonymous instant test (Catchpoint), Chrome 152, 1 run per test |
| Manual browser | Built-in Chromium browser pane of the Claude desktop app |

### Lighthouse settings

- **Mobile:** default config. 412×823 at 1.75× density, simulated throttling: 150 ms RTT, ~1.6 Mbps down, 4× CPU slowdown.
- **Desktop:** official desktop preset. 1350×940 at 1×, 40 ms RTT, 10 Mbps, no CPU slowdown.
- 3 runs per page × form factor; Lighthouse's `computeMedianRun()` selects the reported run.

## Results

### Lighthouse: final run (`reports/audit-summary.json`)

| Metric | Baseline mobile | Optimised mobile | Baseline desktop | Optimised desktop |
|--------|-----------------|------------------|------------------|-------------------|
| Performance (3 runs) | 74 / 74 / 74 | 100 / 100 / 100 | 76 / 76 / 76 | 100 / 100 / 100 |
| Accessibility | 39 | 100 | 39 | 100 |
| Best practices | 100 | 100 | 100 | 100 |
| SEO | 82 | 100 | 82 | 100 |
| FCP | 1,669 ms | 766 ms | 369 ms | 205 ms |
| LCP | 35,106 ms | 984 ms | 5,926 ms | 245 ms |
| TBT | 0 ms | 0 ms | 0 ms | 0 ms |
| CLS | 0 | 0 | 0 | 0 |
| Speed Index | 1,669 ms | 766 ms | 369 ms | 205 ms |
| Transfer | 6,491 KB | 49 KB | 6,491 KB | 37 KB |
| Requests | 9 | 8 | 9 | 8 |

Lighthouse 13 also reports an "Agentic browsing" category (baseline 50, optimised 100). It is recorded in the JSON but is not part of this task.

Failing audits on the baseline included: image delivery (est. 6,185 KB saving), render-blocking requests (est. 1,040 ms on mobile), unused CSS/JS, unminified CSS/JS, unsized images, enormous payload, colour contrast, missing `lang`, missing alt, missing labels, blocked zoom, heading order, no main landmark, table without headers, no meta description. **The optimised page has no failing scored audits.**

### Intermediate measurement: inlining the CSS

`reports/audit-summary-step1-external-css.json` is the full audit of the optimised page **before** the CSS was inlined (it then loaded one external stylesheet):

| Optimised page | External CSS | Inlined CSS | Change |
|----------------|--------------|-------------|--------|
| Mobile FCP / LCP | 915 / 1,126 ms | 766 / 984 ms | −149 / −142 ms |
| Desktop FCP / LCP | 245 / 263 ms | 205 / 245 ms | −40 / −18 ms |
| Requests | 9 | 8 | −1 |

Note: the `validation` section of that step-1 file is not valid. At that point the audit script ran html-validate without the project's config and reported 2 false errors for the shared checkbox `name`. The script was fixed before the final run.

### axe-core

| | Baseline | Optimised |
|-|----------|-----------|
| Violations | 9 rules on 48 elements | **0** |
| Passed rules | 20 | 51 |

Baseline violations: `color-contrast` (serious, 23), `region` (moderate, 17), `label` (critical, 2), `select-name` (critical, 1), `image-alt` (critical, 1), `html-has-lang` (serious, 1), `meta-viewport` (moderate, 1), `heading-order` (moderate, 1), `landmark-one-main` (moderate, 1).

### Validators

| | Baseline | Optimised |
|-|----------|-----------|
| html-validate errors | 6 (`no-dup-id`, `wcag/h37`, `wcag/h32`, `prefer-tbody`, `element-required-attributes`) | **0** |
| csstree-validator errors (own CSS) | 0 | **0** |

### Automated accessibility and loading tests: `npm run a11y`

| # | Test | Result |
|---|------|--------|
| 1 | axe-core: 0 violations at 375 px and 1280 px, no console errors | ✅ Pass |
| 2 | `lang="en"`, zoom not blocked, one `h1`, no skipped heading levels, one each of header/nav/main/footer | ✅ Pass |
| 3 | Every `img` has alt, width and height; hero has `fetchpriority="high"` and is not lazy; all others are lazy; map alt > 40 characters | ✅ Pass |
| 4 | Keyboard: skip link first and visible; Enter focuses `main`; Tab reaches every control in main and footer, each with a visible focus indicator, ending at the document (no trap) | ✅ Pass |
| 5 | FAQ `details` opens with Enter and closes with Space | ✅ Pass |
| 6 | Form: every input/select labelled; empty submit focuses the first invalid field; status "3 fields need attention…"; `aria-invalid` + `aria-describedby`; errors clear while typing; invalid optional phone caught; success message | ✅ Pass |
| 7 | Opening status with frozen clock: 6 cases (open, before opening, at closing time, Sat→Sun, Sun→Mon, Sunday open) | ✅ Pass |
| 8 | Reflow: no horizontal scrolling at 320 px | ✅ Pass |
| 9 | Smooth scrolling only without `prefers-reduced-motion: reduce` | ✅ Pass |

```
ℹ tests 9
ℹ pass 9
ℹ fail 0
```

### Manual checks

| Check | Result |
|-------|--------|
| Both pages viewed in the browser pane | Rendered as expected; baseline problems visible (grey text, text over the image) |
| First Tab shows the skip link top-left with the yellow focus ring; Enter → `#main`; next Tab → "Get a free library card" | Pass |
| Screenshots of baseline/optimised at 375 and 1280 px, focus state and form errors reviewed (`docs/screenshots/`) | Pass |

## Hosted tests (GitHub Pages, 22–23 October 2026)

Both versions were published with GitHub Pages from commit `9e98b41` and tested on the public internet:

- Optimised: <https://takshaksinghania.github.io/frontend-internship-week4-performance-accessibility/>
- Baseline: <https://takshaksinghania.github.io/frontend-internship-week4-performance-accessibility/baseline/>

> The GitHub Pages deployment was taken offline on 23 October 2026 after testing, so these addresses no longer load. The measurements below were recorded while it was live and are unchanged. To test again, re-enable Pages (Settings → Pages → Deploy from branch `main`, folder `/`) or serve locally with `npm run serve`.

GitHub Pages served text files gzipped with `cache-control: max-age=600`. Raw numbers and result links are in [`reports/hosted-tests.json`](reports/hosted-tests.json).

### WAVE (wave.webaim.org web interface)

| | Baseline | Optimised |
|-|----------|-----------|
| Errors | **7** (missing alt ×1, missing form label ×5, language missing ×1) | **0** |
| Contrast errors | **32** | **0** |
| Alerts | 15 | 3 |
| Features / structural elements / ARIA | 0 / 7 / 0 | 16 / 32 / 15 |
| AIM score | 3.4 / 10 | **10 / 10** |

Baseline alerts: select missing label, suspicious alt text ×3, nearby image with the same alt ×2, no page regions, skipped heading level, suspicious link text ×4, redundant link ×2, layout table.

The 3 alerts on the optimised page were each reviewed and kept on purpose:

| Alert | Element | Decision |
|-------|---------|----------|
| Long alternative text | Location map | Kept. The map is the page's only informative image and needs a full description. |
| Possible heading | "Closed now · opens…" status line | Kept as a paragraph. It is a status message, not a section title. |
| Noscript element | Sign-up fallback notice | Intended. It tells users without JavaScript how else to join. |

Screenshots: [`docs/screenshots/wave-optimised.jpg`](docs/screenshots/wave-optimised.jpg), [`docs/screenshots/wave-baseline.jpg`](docs/screenshots/wave-baseline.jpg).

### WebPageTest (webpagetest.org anonymous test, run by Catchpoint, Chrome 152)

Anonymous tests allow only a region, device and connection choice and **one run per test**, so each number below is a single run (no median).

| Metric | Baseline mobile | Optimised mobile | Baseline desktop | Optimised desktop |
|--------|-----------------|------------------|------------------|-------------------|
| Profile | iPhone 15, 4G (9 Mbps, 170 ms RTT), Singapore | same | Desktop, WiFi (240/120 Mbps, 2 ms RTT), Tokyo | same |
| First Contentful Paint | 2.210 s | **1.122 s** | 0.665 s | **0.355 s** |
| Largest Contentful Paint | 5.109 s | **1.630 s** | 1.156 s | **0.572 s** |
| Cumulative Layout Shift | 0 | 0 | **0.439** | **0** |
| Speed Index | 3.624 s | **1.300 s** | 1.071 s | **0.441 s** |
| Start Render | 2.2 s | 1.1 s | 0.6 s | 0.3 s |
| Time to First Byte | 0.950 s | 0.955 s | 0.213 s | 0.222 s |
| Total Blocking Time | 0 s | 0 s | 0 s | 0 s |
| Document complete | 7.915 s | 1.486 s | 1.121 s | 0.505 s |
| Page weight | 6,652,435 B (6.3 MB) | **18,336 B (18 KB)** | 6,647,293 B (6.3 MB) | **35,196 B (34 KB)** |
| Requests | 10 | 5 | 10 | 8 |
| Render-blocking requests | 4 | **0** | 4 | **0** |
| HTTP 4xx | 1 | 0 | 1 | 0 |

What the hosted tests added beyond the local Lighthouse runs:

- **A real layout shift.** Locally, Lighthouse measured CLS 0 for the baseline because the images arrived before the first paint. On the real network the desktop baseline scored **CLS 0.439** ("major layout shifts"), confirming the `unsized-images` warning. The optimised page, with `width`/`height` on every image, stayed at 0.
- **A missing favicon.** The baseline has no `<link rel="icon">`, so browsers request `https://takshaksinghania.github.io/favicon.ico`, which returns **404**. This only shows up when the site is served below a domain root, not on the local server. The optimised page links its own favicon and had no errors.
- **Lazy loading on a real network.** The optimised mobile run made only 5 requests: HTML, `main.min.js`, `hero-reading-room-1600.avif` (the right size for the iPhone 15's 3× screen), `map.svg` and `favicon.svg`. The three event images, far below the fold, were never downloaded.
- **TTFB is the host, not the page.** Time to first byte is the same for both pages (about 0.95 s on the mobile profile, 0.22 s on desktop), because it is GitHub Pages' server response time plus the network round trips. All of the difference comes from what each page loads after that.

Screenshots: `docs/screenshots/webpagetest-{optimised,baseline}-{mobile,desktop}.jpg`. Result links (public, may expire) are in `reports/hosted-tests.json`.

## Defects found and fixed during this work

| # | Defect | Fix |
|---|--------|-----|
| 1 | Optimised page still had ~150 ms render-blocking time on mobile from its single stylesheet | Minified CSS inlined at build time (re-measured: FCP −149 ms) |
| 2 | `check()` in main.js set `aria-invalid=""` before `"true"` (found in code review) | Set or remove the attribute explicitly |
| 3 | html-validate flagged the checkbox group's shared `name` | Valid HTML for checkboxes; rule configured with `shared: ["checkbox", …]` |
| 4 | Audit script validated HTML without the project config (2 false errors) | Uses `FileSystemConfigLoader` for both pages |
| 5 | `css/styles.min.css` remained on disk but unused after inlining | Build no longer writes it; file removed |

## Not performed (and how to reproduce)

| Tool | Why not | How to run it |
|------|---------|---------------|
| WebPageTest with several runs / custom devices | Anonymous tests allow one run and a fixed device list | Sign in to WebPageTest (free account) and repeat with 3+ runs per profile, then compare median runs |
| Screen readers (NVDA, JAWS, VoiceOver) | Not available in this environment | Navigate by landmarks and headings, open the FAQ, submit the empty form and confirm the status message and field errors are announced |
| Real devices / field data | WebPageTest runs are lab tests on emulated devices; the site has no real visitors yet | After real visits, check PageSpeed Insights / Chrome UX Report |

## Reproduce

```bash
npm install
npm test
npm run audit   # about 1–2 minutes; overwrites reports/
```
