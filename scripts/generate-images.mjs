// Draws the library illustrations once, then exports:
//   baseline/img/*.png       one oversized PNG per image (what the unoptimised page uses)
//   assets/img/*.{avif,webp,jpg}  responsive sizes for the optimised page
// A light grain filter gives the drawings photo-like detail, so file sizes behave like real photos.
// Usage: npm run images
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const rng = (seed) => () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;

function shelves(w, h, seed, palette) {
  const rand = rng(seed);
  const rows = 4;
  const rowH = (h * 0.8) / rows;
  let books = '';
  for (let r = 0; r < rows; r++) {
    const base = h * 0.12 + rowH * (r + 1);
    let x = w * 0.06;
    while (x < w * 0.94) {
      const bw = w * (0.012 + rand() * 0.02);
      const bh = rowH * (0.55 + rand() * 0.35);
      const color = palette.books[Math.floor(rand() * palette.books.length)];
      books += `<rect x="${x.toFixed(1)}" y="${(base - bh).toFixed(1)}" width="${bw.toFixed(1)}" height="${bh.toFixed(1)}" rx="2" fill="${color}"/>`;
      if (rand() > 0.7) books += `<rect x="${x.toFixed(1)}" y="${(base - bh * 0.8).toFixed(1)}" width="${bw.toFixed(1)}" height="${(rowH * 0.04).toFixed(1)}" fill="#ffffff" opacity=".35"/>`;
      x += bw + w * 0.002;
      if (rand() > 0.93) x += w * 0.03;
    }
    books += `<rect x="${w * 0.04}" y="${base}" width="${w * 0.92}" height="${rowH * 0.08}" fill="${palette.shelf}"/>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${palette.wall[0]}"/><stop offset="1" stop-color="${palette.wall[1]}"/></linearGradient>
      <filter id="grain"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="${seed}"/><feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 .22 0"/><feComposite in2="SourceGraphic" operator="in"/><feBlend in="SourceGraphic" mode="multiply"/></filter>
    </defs>
    <g filter="url(#grain)">
      <rect width="${w}" height="${h}" fill="url(#bg)"/>
      <rect x="${w * 0.04}" y="${h * 0.08}" width="${w * 0.92}" height="${h * 0.86}" fill="${palette.case}"/>
      ${books}
      <circle cx="${w * palette.lamp}" cy="${h * 0.06}" r="${h * 0.05}" fill="#fff3c4" opacity=".9"/>
    </g></svg>`;
}

const palettes = {
  hero: { wall: ['#2c3e50', '#1f2d3a'], case: '#5b3a29', shelf: '#3e271b', lamp: 0.8, books: ['#b03a2e', '#1f618d', '#d4ac0d', '#239b56', '#7d3c98', '#e67e22', '#f4f1e8', '#17202a'] },
  story: { wall: ['#f6e7c8', '#ead2a5'], case: '#a0522d', shelf: '#7a3e1d', lamp: 0.2, books: ['#e74c3c', '#f1c40f', '#3498db', '#2ecc71', '#9b59b6', '#ffffff'] },
  code: { wall: ['#1b2631', '#212f3d'], case: '#34495e', shelf: '#22313f', lamp: 0.5, books: ['#1abc9c', '#16a085', '#3498db', '#95a5a6', '#ecf0f1', '#f39c12'] },
  circle: { wall: ['#e8f0e3', '#d5e3cc'], case: '#6e7f5a', shelf: '#4d5a3e', lamp: 0.7, books: ['#c0392b', '#d35400', '#8e44ad', '#2c3e50', '#f5f5dc', '#27ae60'] },
};

// name, palette, seed, width, height, optimised widths
const images = [
  ['hero-reading-room', 'hero', 3, 2400, 1200, [640, 1024, 1600]],
  ['event-storytime', 'story', 11, 1600, 1066, [400, 800]],
  ['event-coding-club', 'code', 17, 1600, 1066, [400, 800]],
  ['event-book-circle', 'circle', 29, 1600, 1066, [400, 800]],
];

await mkdir(`${root}baseline/img`, { recursive: true });
await mkdir(`${root}assets/img`, { recursive: true });
const kb = (n) => `${(n / 1024).toFixed(1)} KB`;

for (const [name, pal, seed, w, h, widths] of images) {
  const svg = Buffer.from(shelves(w, h, seed, palettes[pal]));
  const png = await sharp(svg).png().toFile(`${root}baseline/img/${name}.png`);
  console.log(`baseline/img/${name}.png  ${w}x${h}  ${kb(png.size)}`);
  for (const width of widths) {
    const resized = sharp(svg).resize(width);
    for (const [ext, fn] of [['avif', (s) => s.avif({ quality: 50 })], ['webp', (s) => s.webp({ quality: 72 })], ['jpg', (s) => s.jpeg({ quality: 74, mozjpeg: true })]]) {
      const info = await fn(resized.clone()).toFile(`${root}assets/img/${name}-${width}.${ext}`);
      console.log(`  assets/img/${name}-${width}.${ext}  ${info.width}x${info.height}  ${kb(info.size)}`);
    }
  }
}
