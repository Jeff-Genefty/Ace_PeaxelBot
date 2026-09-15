import sharp from 'sharp';
import { resolve } from 'path';
import { existsSync } from 'fs';

const srcOriginal = resolve('C:/Users/pigno/.cursor/projects/d-DEV-HEBERG-Bot-Peaxel/assets/c__Users_pigno_AppData_Roaming_Cursor_User_workspaceStorage_9964d576e7b2a29add63479955cdf444_images_image-d7219786-aa34-4b2b-8ec7-fd5bc6b9f39d.png');
const out = resolve('./assets/faq-welcome.png');
const src = existsSync(srcOriginal) ? srcOriginal : resolve('./assets/faq-welcome.png');

const base = await sharp(src).resize(1280, 720, { fit: 'fill' }).raw().toBuffer({ resolveWithObject: true });
const { data, info } = base;

function sample(x, y) {
    const i = (y * info.width + x) * info.channels;
    return { r: data[i], g: data[i + 1], b: data[i + 2] };
}

const samples = [sample(1050, 420), sample(1120, 450), sample(1000, 500), sample(1180, 380), sample(980, 560)];
const bg = {
    r: Math.round(samples.reduce((s, p) => s + p.r, 0) / samples.length),
    g: Math.round(samples.reduce((s, p) => s + p.g, 0) / samples.length),
    b: Math.round(samples.reduce((s, p) => s + p.b, 0) / samples.length),
};

// Larger cover to hide original titles + URL + grass reflection
const cover = { left: 740, top: 230, width: 520, height: 360 };
const patch = await sharp({
    create: {
        width: cover.width,
        height: cover.height,
        channels: 3,
        background: bg,
    },
}).png().toBuffer();

// Spell URL with explicit letter grouping so "genefty" cannot be confused
const correctUrl = 'peaxel.genefty.com';
const svg = Buffer.from(`<svg width="${cover.width}" height="${cover.height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="rgb(${bg.r},${bg.g},${bg.b})"/>
  <text x="12" y="78" font-family="Arial Black, Impact, Arial, sans-serif" font-size="70" font-weight="900" fill="#ffffff">PEAXEL</text>
  <text x="12" y="155" font-family="Arial Black, Impact, Arial, sans-serif" font-size="70" font-weight="900" fill="#ffffff">FAQ</text>
  <text x="12" y="210" font-family="Arial, Helvetica, sans-serif" font-size="28" font-weight="500" fill="#e8eef5">Welcome to the Community</text>
  <text x="12" y="265" font-family="Consolas, Courier New, monospace" font-size="28" font-weight="700" fill="#22d3ee">${correctUrl}</text>
</svg>`);

await sharp(src)
    .resize(1280, 720, { fit: 'fill' })
    .composite([
        { input: patch, left: cover.left, top: cover.top },
        { input: svg, left: cover.left, top: cover.top },
    ])
    .png()
    .toFile(out);

console.log('OK', correctUrl, '→', out);
