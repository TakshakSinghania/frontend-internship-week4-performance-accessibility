// Captures baseline vs optimised pages and a few accessibility states into docs/screenshots.
// Usage: npm run screenshots
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';
import { startServer } from './serve.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const out = (name) => `${root}docs/screenshots/${name}.jpg`;
const server = await startServer();
const base = `http://127.0.0.1:${server.address().port}/`;
const browser = await puppeteer.launch({ executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });

async function open(path, width, height) {
  const page = await browser.newPage();
  await page.setViewport({ width, height });
  await page.goto(base + path, { waitUntil: 'networkidle0' });
  return page;
}

for (const [name, path] of [['baseline', 'baseline/'], ['optimised', '']]) {
  for (const [w, h] of [[375, 812], [1280, 800]]) {
    const page = await open(path, w, h);
    await page.screenshot({ path: out(`${name}-${w}`), type: 'jpeg', quality: 80 });
    await page.close();
  }
}

// keyboard focus on a nav link and on a button
let page = await open('', 1280, 800);
for (let i = 0; i < 3; i++) await page.keyboard.press('Tab');
await page.screenshot({ path: out('focus-nav'), type: 'jpeg', quality: 85, clip: { x: 0, y: 0, width: 1280, height: 140 } });
await page.close();

// form errors after an empty submit
page = await open('', 1280, 900);
await page.click('[data-signup] button[type="submit"]');
const form = await page.$('#join .wrap');
await form.screenshot({ path: out('form-errors'), type: 'jpeg', quality: 85 });
await page.close();

await browser.close();
server.close();
console.log('Screenshots saved to docs/screenshots');
