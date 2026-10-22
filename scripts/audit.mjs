// Audits the baseline and the optimised page with the same tools and settings, and writes reports/.
//   Lighthouse 13: mobile (default throttling) and desktop presets, 3 runs each, median run kept
//   axe-core 4.14: WCAG 2.0/2.1/2.2 A+AA and best-practice rules
//   html-validate and csstree-validator: error counts
// Usage: npm run audit   (takes a few minutes; set CHROME_PATH if Chrome is elsewhere)
import { writeFileSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import lighthouse from 'lighthouse';
import desktopConfig from 'lighthouse/core/config/desktop-config.js';
import { computeMedianRun } from 'lighthouse/core/lib/median-run.js';
import * as chromeLauncher from 'chrome-launcher';
import puppeteer from 'puppeteer-core';
import { HtmlValidate, FileSystemConfigLoader } from 'html-validate';
import { validate as validateCss } from 'csstree-validator';
import { startServer } from './serve.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const chromePath = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const RUNS = 3;
const targets = { baseline: 'baseline/', optimised: '' };
const server = await startServer();
const base = `http://127.0.0.1:${server.address().port}/`;
const summary = { generated: new Date().toISOString(), environment: {}, lighthouse: {}, axe: {}, validation: {} };

/* Lighthouse */
const chrome = await chromeLauncher.launch({ chromePath, chromeFlags: ['--headless=new', '--no-first-run'] });
const metric = (lhr, id) => lhr.audits[id]?.numericValue ?? null;
for (const [name, path] of Object.entries(targets)) {
  for (const formFactor of ['mobile', 'desktop']) {
    const runs = [];
    for (let i = 0; i < RUNS; i++) {
      const result = await lighthouse(`${base}${path}`, { port: chrome.port, output: 'html', logLevel: 'error' }, formFactor === 'desktop' ? desktopConfig : undefined);
      runs.push(result);
      process.stdout.write(`lighthouse ${name} ${formFactor} run ${i + 1}: performance ${Math.round(result.lhr.categories.performance.score * 100)}\n`);
    }
    const median = computeMedianRun(runs.map((r) => r.lhr));
    const medianRun = runs.find((r) => r.lhr === median);
    writeFileSync(`${root}reports/lighthouse-${name}-${formFactor}.html`, medianRun.report);
    summary.environment = { lighthouse: median.lighthouseVersion, chrome: median.environment.hostUserAgent.match(/Chrome\/[\d.]+/)?.[0], throttling: 'Lighthouse defaults (mobile: simulated slow 4G + 4x CPU; desktop preset)' };
    summary.lighthouse[`${name}-${formFactor}`] = {
      runs: runs.map((r) => Math.round(r.lhr.categories.performance.score * 100)),
      scores: Object.fromEntries(Object.entries(median.categories).map(([k, c]) => [k, Math.round(c.score * 100)])),
      metrics: {
        fcpMs: Math.round(metric(median, 'first-contentful-paint')),
        lcpMs: Math.round(metric(median, 'largest-contentful-paint')),
        tbtMs: Math.round(metric(median, 'total-blocking-time')),
        cls: Number(metric(median, 'cumulative-layout-shift').toFixed(3)),
        speedIndexMs: Math.round(metric(median, 'speed-index')),
        totalKB: Math.round(metric(median, 'total-byte-weight') / 1024),
        requests: median.audits['network-requests'].details.items.length,
      },
      failing: Object.values(median.audits)
        .filter((a) => a.score !== null && a.score < 0.9 && ['numeric', 'binary', 'metricSavings'].includes(a.scoreDisplayMode))
        .map((a) => `${a.id}: ${a.title}${a.displayValue ? ` (${a.displayValue})` : ''}`),
    };
  }
}
await chrome.kill();

/* axe-core */
const browser = await puppeteer.launch({ executablePath: chromePath, headless: true });
const axeSource = readFileSync(createRequire(import.meta.url).resolve('axe-core/axe.min.js'), 'utf8');
for (const [name, path] of Object.entries(targets)) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });
  await page.goto(`${base}${path}`, { waitUntil: 'networkidle0' });
  await page.evaluate(axeSource);
  const result = await page.evaluate(() => window.axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'] }));
  summary.axe[name] = {
    version: result.testEngine.version,
    violations: result.violations.map((v) => ({ id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.length })),
    totalNodes: result.violations.reduce((n, v) => n + v.nodes.length, 0),
    passes: result.passes.length,
  };
  await page.close();
}
await browser.close();
server.close();

/* Validators */
const htmlvalidate = new HtmlValidate(new FileSystemConfigLoader()); // uses .htmlvalidate.json, same rules for both pages
for (const [name, file, css] of [['baseline', 'baseline/index.html', 'baseline/css/style.css'], ['optimised', 'index.html', 'css/styles.css']]) {
  const report = await htmlvalidate.validateFile(root + file);
  const cssErrors = Object.values(validateCss(readFileSync(root + css, 'utf8'), css)).flat().length;
  summary.validation[name] = { htmlErrors: report.errorCount, htmlRules: [...new Set(report.results.flatMap((r) => r.messages.map((m) => m.ruleId)))], cssErrors };
}

writeFileSync(`${root}reports/audit-summary.json`, JSON.stringify(summary, null, 2) + '\n');
console.log(JSON.stringify({ lighthouse: Object.fromEntries(Object.entries(summary.lighthouse).map(([k, v]) => [k, { ...v.scores, ...v.metrics, runs: v.runs.join('/') }])), axe: Object.fromEntries(Object.entries(summary.axe).map(([k, v]) => [k, `${v.violations.length} rules, ${v.totalNodes} nodes`])), validation: summary.validation }, null, 2));
