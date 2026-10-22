// Minifies js/main.js → js/main.min.js, and minifies css/styles.css straight into the <style> block of index.html.
// The whole stylesheet is under 2 KB gzipped, so inlining it removes a render-blocking request
// (measured: see reports/). css/styles.css stays the file you edit; re-run this after changing it.
// Usage: npm run build
import { build } from 'esbuild';
import { readFileSync, writeFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const size = (buf) => `${(buf.length / 1024).toFixed(1)} KB (${(gzipSync(buf).length / 1024).toFixed(1)} KB gzip)`;
const options = { minify: true, target: ['chrome100', 'safari15', 'firefox100'], logLevel: 'warning' };

await build({ ...options, entryPoints: [root + 'js/main.js'], outfile: root + 'js/main.min.js' });
console.log(`js/main.js       ${size(readFileSync(root + 'js/main.js'))}  →  js/main.min.js  ${size(readFileSync(root + 'js/main.min.js'))}`);

const { outputFiles } = await build({ ...options, entryPoints: [root + 'css/styles.css'], write: false, outdir: 'out' });
const css = outputFiles[0].text.trim();
const html = readFileSync(root + 'index.html', 'utf8');
const marker = /(<style data-inline-from="css\/styles\.css">)[\s\S]*?(<\/style>)/;
if (!marker.test(html)) throw new Error('index.html is missing <style data-inline-from="css/styles.css"></style>');
writeFileSync(root + 'index.html', html.replace(marker, (_, open, close) => `${open}${css}${close}`));
console.log(`css/styles.css   ${size(readFileSync(root + 'css/styles.css'))}  →  inlined in index.html  ${size(Buffer.from(css))}`);
