# Baseline (unoptimised starting version)

This folder is the **"before"** version of the Week 4 page. It is kept only so it can be audited and compared with the optimised page in the project root. Do not use it as an example of good practice.

It contains these problems on purpose, so they can be found, measured and fixed:

| Area | Problem in this baseline |
|------|---------------------------|
| Render blocking | Full unminified Bootstrap CSS (280 KB) and jQuery (285 KB) loaded synchronously in `<head>` for a few styles and two click handlers |
| Images | 1.3–1.9 MB PNGs at 1600–2400 px wide, no `width`/`height`, no lazy loading |
| Language & zoom | No `lang` attribute; `user-scalable=no` blocks pinch zoom |
| Structure | No landmarks or skip link; headings jump from `h1` to `h4`; card titles are `div`s |
| Images (a11y) | Hero image has no `alt`; event images use `alt="image"` |
| Contrast | Light-grey text (`#999`, `#aaa`, `#bbb`) and white on orange buttons |
| Links | "Click here" and three identical "Read more" links |
| Forms | Placeholder-only fields with no labels, a `div` as the submit button, errors shown with `alert()` |
| Keyboard | FAQ answers open only on mouse click on `div`s; all focus outlines removed |
| Motion | Infinite pulsing button that ignores `prefers-reduced-motion` |
| Validity | Duplicate `id="event"` |

`vendor/` holds unmodified copies of Bootstrap 5.3.8 and jQuery 3.7.1 (both MIT-licensed; licence files included).
