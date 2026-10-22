// Accessibility and loading-behaviour tests for the optimised page (headless Chrome + axe-core).
// Usage: npm run a11y   (set CHROME_PATH if Chrome is not at the default macOS location)
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import puppeteer from 'puppeteer-core';
import { startServer } from '../scripts/serve.mjs';

const axePath = createRequire(import.meta.url).resolve('axe-core/axe.min.js');
let server;
let browser;
let base;

before(async () => {
  server = await startServer();
  base = `http://127.0.0.1:${server.address().port}/`;
  browser = await puppeteer.launch({ executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
});
after(async () => { await browser?.close(); server?.close(); });

async function open({ width = 1280, height = 900, now, reducedMotion } = {}) {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.setViewport({ width, height });
  if (reducedMotion) await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  if (now) {
    // freeze the clock so the opening-status text is predictable
    await page.evaluateOnNewDocument((iso) => {
      const fixed = new Date(iso).getTime();
      const RealDate = Date;
      globalThis.Date = class extends RealDate { constructor(...a) { super(...(a.length ? a : [fixed])); } static now() { return fixed; } };
    }, now);
  }
  await page.goto(base, { waitUntil: 'networkidle0' });
  page.errors = errors;
  return page;
}

async function axe(page) {
  await page.addScriptTag({ path: axePath });
  return page.evaluate(() => window.axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'] }));
}

test('axe-core: no violations at 375 px and 1280 px', async () => {
  for (const width of [375, 1280]) {
    const page = await open({ width });
    const result = await axe(page);
    assert.deepEqual(result.violations.map((v) => `${v.id} (${v.nodes.length})`), [], `${width}px`);
    assert.ok(result.passes.length > 20, 'axe actually ran its checks');
    assert.deepEqual(page.errors, []);
    await page.close();
  }
});

test('document basics: language, zoom allowed, one h1, no skipped heading levels', async () => {
  const page = await open();
  const r = await page.evaluate(() => ({
    lang: document.documentElement.lang,
    viewport: document.querySelector('meta[name="viewport"]').content,
    levels: [...document.querySelectorAll('h1, h2, h3, h4, h5, h6')].map((h) => Number(h.tagName[1])),
    landmarks: ['header', 'nav', 'main', 'footer'].map((t) => document.querySelectorAll(t).length),
  }));
  assert.equal(r.lang, 'en');
  assert.doesNotMatch(r.viewport, /user-scalable=no|maximum-scale/);
  assert.equal(r.levels.filter((l) => l === 1).length, 1);
  r.levels.forEach((level, i) => assert.ok(i === 0 || level <= r.levels[i - 1] + 1, `heading level jumps to h${level}`));
  assert.deepEqual(r.landmarks, [1, 1, 1, 1]);
  await page.close();
});

test('images: alt present on all, informative map described, dimensions set, lazy loading below the fold', async () => {
  const page = await open();
  const imgs = await page.$$eval('img', (list) => list.map((i) => ({
    src: i.getAttribute('src'), alt: i.getAttribute('alt'), w: i.getAttribute('width'), h: i.getAttribute('height'),
    loading: i.getAttribute('loading'), priority: i.getAttribute('fetchpriority'),
  })));
  imgs.forEach((i) => {
    assert.notEqual(i.alt, null, `${i.src} has an alt attribute`);
    assert.ok(i.w && i.h, `${i.src} has width and height`);
  });
  const [hero, ...rest] = imgs;
  assert.equal(hero.priority, 'high');
  assert.equal(hero.loading, null, 'LCP image is not lazy-loaded');
  rest.forEach((i) => assert.equal(i.loading, 'lazy', `${i.src} is lazy`));
  assert.ok(imgs.find((i) => i.src.includes('map')).alt.length > 40, 'map has a real text alternative');
  await page.close();
});

test('keyboard: skip link first, every control reachable with a visible focus indicator, no trap', async () => {
  const page = await open();
  await page.keyboard.press('Tab');
  assert.equal(await page.evaluate(() => document.activeElement.textContent), 'Skip to main content');
  const skipVisible = await page.evaluate(() => document.activeElement.getBoundingClientRect().top >= 0);
  assert.ok(skipVisible, 'skip link moves on screen when focused');
  await page.keyboard.press('Enter');
  assert.equal(await page.evaluate(() => document.activeElement.id), 'main');

  const expected = await page.evaluate(() => document.querySelectorAll('main a[href], main button, main input, main select, main summary, footer a[href]').length);
  const seen = [];
  for (let i = 0; i < expected + 5; i++) {
    await page.keyboard.press('Tab');
    const info = await page.evaluate(() => {
      const el = document.activeElement;
      const s = getComputedStyle(el);
      return { tag: el.tagName, text: (el.textContent || el.name || '').trim().slice(0, 30), ring: s.outlineStyle !== 'none' || s.boxShadow !== 'none' };
    });
    if (info.tag === 'BODY') break;
    seen.push(info);
  }
  assert.ok(seen.length >= expected, `reached ${seen.length} of ${expected} controls`);
  seen.forEach((s) => assert.ok(s.ring, `visible focus on ${s.tag} "${s.text}"`));
  await page.close();
});

test('FAQ uses native details/summary and opens from the keyboard', async () => {
  const page = await open();
  await page.focus('summary');
  await page.keyboard.press('Enter');
  assert.equal(await page.$eval('details', (d) => d.open), true);
  await page.keyboard.press('Space');
  assert.equal(await page.$eval('details', (d) => d.open), false);
  await page.close();
});

test('form: labelled fields, errors linked and announced, focus moves to first problem, success message', async () => {
  const page = await open();
  const unlabeled = await page.$$eval('input, select', (els) => els.filter((e) => !e.labels?.length).length);
  assert.equal(unlabeled, 0);

  await page.click('[data-signup] button[type="submit"]');
  assert.equal(await page.evaluate(() => document.activeElement.id), 'name');
  assert.equal(await page.$eval('[data-form-status]', (s) => s.textContent), '3 fields need attention. The first one has been selected.');
  assert.equal(await page.$eval('[data-form-status]', (s) => s.getAttribute('role')), 'status');
  assert.equal(await page.$eval('#email', (i) => i.getAttribute('aria-invalid')), 'true');
  assert.equal(await page.$eval('#email-error', (e) => !e.hidden && e.textContent), 'Enter an email address in the format name@example.com.');
  assert.match(await page.$eval('#email', (i) => i.getAttribute('aria-describedby')), /email-error/);

  await page.type('#name', 'Meera Iyer');
  assert.equal(await page.$eval('#name', (i) => i.hasAttribute('aria-invalid')), false, 'error clears while typing');
  await page.type('#email', 'meera@example.com');
  await page.type('#phone', '12345');
  await page.select('#branch', 'Lakeside');
  await page.click('[data-signup] button[type="submit"]');
  assert.equal(await page.evaluate(() => document.activeElement.id), 'phone', 'optional field still validated when filled');
  await page.$eval('#phone', (i) => { i.value = ''; });
  await page.click('[data-signup] button[type="submit"]');
  assert.match(await page.$eval('[data-form-status]', (s) => s.textContent), /^Thank you, Meera\./);
  assert.deepEqual(page.errors, []);
  await page.close();
});

test('opening status is correct for different days and times', async () => {
  const cases = [
    ['2026-10-26T10:00:00', 'Open now · closes at 20:00'], // Monday morning
    ['2026-10-26T08:15:00', 'Closed now · opens today at 09:00'], // Monday before opening
    ['2026-10-26T20:00:00', 'Closed now · opens tomorrow at 09:00'], // Monday at closing time
    ['2026-10-31T19:00:00', 'Closed now · opens tomorrow at 12:00'], // Saturday evening -> Sunday
    ['2026-11-01T17:00:00', 'Closed now · opens tomorrow at 09:00'], // Sunday evening -> Monday
    ['2026-11-01T12:30:00', 'Open now · closes at 16:00'], // Sunday afternoon
  ];
  for (const [now, expected] of cases) {
    const page = await open({ now });
    assert.equal(await page.$eval('[data-open-status]', (s) => s.textContent), expected, now);
    await page.close();
  }
});

test('reflow: no horizontal scrolling at 320 px (equivalent to 400% zoom on 1280 px)', async () => {
  const page = await open({ width: 320, height: 640 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), 0);
  await page.close();
});

test('reduced motion: smooth scrolling only when the user has not asked for less motion', async () => {
  const reduced = await open({ reducedMotion: true });
  assert.equal(await reduced.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior), 'auto');
  await reduced.close();
  const normal = await open();
  assert.equal(await normal.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior), 'smooth');
  await normal.close();
});
