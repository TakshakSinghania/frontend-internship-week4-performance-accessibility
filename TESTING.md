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
| Server | `scripts/serve.mjs` on 127.0.0.1: gzip for HTML/CSS/JS/SVG, `Cache-Control: no-cache` |
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
| WAVE | Needs a publicly reachable URL or the browser extension in a normal browser profile | Enable GitHub Pages for this repo, then open `https://wave.webaim.org/report#/<page-url>` for `/` and `/baseline/`, or use the WAVE extension on `npm run serve` |
| WebPageTest | Needs a public URL | On webpagetest.org, test both URLs with "Moto G (gen 4), 4G, 3 runs" and compare the median runs |
| Screen readers (NVDA, JAWS, VoiceOver) | Not available in this environment | Navigate by landmarks and headings, open the FAQ, submit the empty form and confirm the status message and field errors are announced |
| Real devices / field data | Only local lab runs | Host the page and check PageSpeed Insights / Chrome UX Report after real visits |

## Reproduce

```bash
npm install
npm test
npm run audit   # about 1–2 minutes; overwrites reports/
```
