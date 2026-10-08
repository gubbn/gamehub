import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { starterPictures, bundledPictures } from "./eli-data";
import { eliShapeIds } from "./EliPicture";
describe("Bundled Eli artwork", () => {
  it("bundles all 24 objects and keeps six precise shapes", () => {
    const illustrations = starterPictures.filter((p) => p.asset);
    expect(illustrations).toHaveLength(24);
    expect(starterPictures.filter((p) => !p.asset).map((p) => p.id)).toEqual(
      eliShapeIds.slice(0, 6),
    );
    let bytes = 0;
    for (const p of illustrations) {
      const path = resolve("public", p.asset.slice(1));
      expect(existsSync(path), p.label).toBe(true);
      const image = readFileSync(path);
      expect(image.toString("ascii", 8, 12)).toBe("WEBP");
      expect(image.byteLength).toBeLessThan(120000);
      bytes += image.byteLength;
    }
    expect(bytes).toBeLessThan(1500000);
  });
  it("bundles all 100 word illustrations with an efficient offline footprint", () => {
    const illustrations = bundledPictures.filter((p) => p.asset);
    expect(illustrations).toHaveLength(100);
    let bytes = 0;
    for (const p of illustrations) {
      const path = resolve("public", p.asset.slice(1));
      expect(existsSync(path), p.label).toBe(true);
      const image = readFileSync(path);
      expect(image.toString("ascii", 8, 12)).toBe("WEBP");
      expect(image.byteLength, p.label).toBeLessThan(120000);
      bytes += image.byteLength;
    }
    expect(bytes).toBeLessThan(8000000);
    expect(
      bundledPictures.filter((p) => p.category === "Shapes").map((p) => p.id),
    ).toEqual(eliShapeIds);
  });
});
