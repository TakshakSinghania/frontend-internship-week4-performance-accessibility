// Small static server used for audits: gzip for text files, like typical static hosting.
// Usage: npm run serve  (port 8080, or PORT=xxxx)   ·   also imported by scripts/audit.mjs and the tests
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { gzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const types = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.avif': 'image/avif', '.json': 'application/json',
};
const compressible = new Set(['.html', '.css', '.js', '.svg', '.json']);

export function startServer(port = 0) {
  const server = http.createServer(async (req, res) => {
    let path = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^(\.\.[/\\])+/, '');
    if (path.endsWith('/')) path += 'index.html';
    const ext = extname(path);
    try {
      let body = await readFile(join(root, path));
      const headers = { 'Content-Type': types[ext] || 'application/octet-stream', 'Cache-Control': 'no-cache' };
      if (compressible.has(ext) && /\bgzip\b/.test(req.headers['accept-encoding'] || '')) {
        body = gzipSync(body);
        headers['Content-Encoding'] = 'gzip';
      }
      res.writeHead(200, headers).end(body);
    } catch {
      res.writeHead(404, { 'Content-Type': 'text/plain' }).end('Not found');
    }
  });
  return new Promise((resolve) => server.listen(port, '127.0.0.1', () => resolve(server)));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const server = await startServer(Number(process.env.PORT) || 8080);
  console.log(`Serving on http://127.0.0.1:${server.address().port}/  (baseline at /baseline/)`);
}
