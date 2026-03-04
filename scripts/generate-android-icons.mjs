/**
 * Generates Android launcher PNG icons from public/icon-512.svg
 * Run: node scripts/generate-android-icons.mjs
 */

import sharp from "sharp";
import { readFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const svgPath = join(root, "public", "icon-512.svg");
const svgBuffer = readFileSync(svgPath);

// Android icon sizes (density → size in px)
const DENSITIES = [
  { name: "mipmap-mdpi",    size: 48  },
  { name: "mipmap-hdpi",    size: 72  },
  { name: "mipmap-xhdpi",   size: 96  },
  { name: "mipmap-xxhdpi",  size: 144 },
  { name: "mipmap-xxxhdpi", size: 192 },
];

// Play Store high-res icon
const PLAY_STORE = { name: "play-store", size: 512 };

const androidResDir = join(root, "android", "app", "src", "main", "res");

for (const density of DENSITIES) {
  const dir = join(androidResDir, density.name);
  mkdirSync(dir, { recursive: true });

  // ic_launcher (square with rounded corners via resize)
  await sharp(svgBuffer)
    .resize(density.size, density.size)
    .png()
    .toFile(join(dir, "ic_launcher.png"));

  // ic_launcher_round (circle crop)
  const radius = Math.floor(density.size / 2);
  const circleSvg = Buffer.from(
    `<svg width="${density.size}" height="${density.size}">` +
    `<circle cx="${radius}" cy="${radius}" r="${radius}" fill="black"/>` +
    `</svg>`
  );
  const circleMask = await sharp(circleSvg).png().toBuffer();

  await sharp(svgBuffer)
    .resize(density.size, density.size)
    .composite([{ input: circleMask, blend: "dest-in" }])
    .png()
    .toFile(join(dir, "ic_launcher_round.png"));

  console.log(`✓ ${density.name} (${density.size}px)`);
}

// Play Store icon
const playStoreDir = join(root, "android", "play-store");
mkdirSync(playStoreDir, { recursive: true });
await sharp(svgBuffer)
  .resize(PLAY_STORE.size, PLAY_STORE.size)
  .png()
  .toFile(join(playStoreDir, "icon-512.png"));
console.log(`✓ play-store/icon-512.png (512px)`);

console.log("\nAll Android icons generated!");
console.log("Now open Android Studio → Right-click res → Image Asset Studio");
console.log("to preview/verify the adaptive icon layers.");
