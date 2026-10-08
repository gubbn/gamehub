// Lossy asset encoding only; the artwork itself is created with built-in ImageGen.
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { resolve, join } from "node:path";
const [mapPath, sharpPath, contactSheetPath] = process.argv.slice(2);
if (!mapPath)
  throw new Error(
    "Pass the generated-art source-map JSON path and optionally a Sharp module path.",
  );
const require = createRequire(import.meta.url);
const sharp = require(sharpPath || "sharp");
const sources = JSON.parse(await readFile(mapPath, "utf8"));
const output = resolve("public/eli-art");
await mkdir(output, { recursive: true });
let total = 0;
for (const [id, path] of Object.entries(sources)) {
  if (!/^[a-z]+$/.test(id) || typeof path !== "string")
    throw new Error("Invalid source map.");
  const image = await sharp(path)
    .resize(512, 512, { fit: "contain", background: "#fffdfa" })
    .webp({ quality: 86, effort: 6 })
    .toBuffer();
  await writeFile(join(output, `${id}.webp`), image);
  total += image.length;
  console.log(`${id}: ${image.length} bytes`);
}
console.log(`${Object.keys(sources).length} images, ${total} bytes total`);
if (contactSheetPath) {
  const layers = [];
  for (const [index, id] of Object.keys(sources).entries()) {
    const x = (index % 6) * 192,
      y = Math.floor(index / 6) * 220;
    layers.push({
      input: await sharp(join(output, `${id}.webp`))
        .resize(184, 184)
        .png()
        .toBuffer(),
      left: x + 4,
      top: y + 4,
    });
    layers.push({
      input: Buffer.from(
        `<svg width="192" height="28"><text x="96" y="19" text-anchor="middle" font-family="sans-serif" font-size="15" fill="#534c5b">${id}</text></svg>`,
      ),
      left: x,
      top: y + 190,
    });
  }
  await sharp({
    create: {
      width: 1152,
      height: Math.ceil(Object.keys(sources).length / 6) * 220,
      channels: 3,
      background: "#fffdfa",
    },
  })
    .composite(layers)
    .jpeg({ quality: 92 })
    .toFile(contactSheetPath);
}
