import { gzipSync } from 'node:zlib';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const distDirectory = path.resolve(process.cwd(), 'dist');
const htmlPath = path.join(distDirectory, 'index.html');
const maxInitialGzipBytes = 300 * 1024;

if (!existsSync(htmlPath)) {
  console.error('Build production belum tersedia. Jalankan npm run build terlebih dahulu.');
  process.exit(1);
}

const html = readFileSync(htmlPath, 'utf8');
const assetUrls = [...html.matchAll(/(?:src|href)="(\/assets\/[^\"]+)"/g)]
  .map(match => match[1])
  .filter((url): url is string => Boolean(url));
const uniqueAssetUrls = [...new Set(assetUrls)];

if (uniqueAssetUrls.length === 0) {
  console.error('Tidak menemukan aset JS/CSS awal di dist/index.html.');
  process.exit(1);
}

const assets = uniqueAssetUrls.map(url => {
  const assetPath = path.resolve(distDirectory, `.${url}`);
  const assetDirectory = path.resolve(distDirectory, 'assets') + path.sep;
  if (!assetPath.startsWith(assetDirectory) || !existsSync(assetPath)) {
    throw new Error(`Aset build tidak ditemukan atau path tidak valid: ${url}`);
  }
  const bytes = readFileSync(assetPath);
  return { name: path.basename(assetPath), gzipBytes: gzipSync(bytes, { level: 6 }).byteLength };
});

const totalGzipBytes = assets.reduce((total, asset) => total + asset.gzipBytes, 0);
console.table(assets);
console.info(`Aset awal: ${(totalGzipBytes / 1024).toFixed(1)} KiB gzip (batas ${(maxInitialGzipBytes / 1024).toFixed(0)} KiB).`);

if (totalGzipBytes > maxInitialGzipBytes) {
  console.error('Budget performa awal terlampaui. Tinjau dependensi awal dan preload sebelum rilis.');
  process.exit(1);
}
