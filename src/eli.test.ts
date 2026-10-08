import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import {
  allPictures,
  newEliLibrary,
  playablePictures,
  recognitionQuestion,
  starterPictures,
  validateEliBackup,
} from "./eli-data";
import { eliDb, initializeEli, updateEli } from "./eli-db";
import { db, initialize, exportState } from "./db";

const photo = {
  id: "custom:example",
  label: "Teddy",
  category: "My pictures" as const,
  color: "#8b78b4",
  image: "data:image/jpeg;base64,/9j/2Q==",
};
const backup = () => ({
  format: "gamehub-eli",
  version: 1,
  library: { ...newEliLibrary(), pictures: [photo] },
});
describe("Eli picture recognition", () => {
  it("supports older backups and validates card colour choices", () => {
    const old = backup();
    delete old.library.palette;
    expect(validateEliBackup(old).palette).toBe("sage");
    for (const palette of ["sage", "sand", "rose", "sky"] as const)
      expect(
        validateEliBackup({ ...old, library: { ...old.library, palette } })
          .palette,
      ).toBe(palette);
    expect(() =>
      validateEliBackup({
        ...old,
        library: { ...old.library, palette: "bad" },
      }),
    ).toThrow(/valid Eli Zone/);
  });
  it("starts with 30 uniquely named pictures in five categories", () => {
    expect(starterPictures).toHaveLength(30);
    expect(new Set(starterPictures.map((p) => p.id)).size).toBe(30);
    expect(
      new Set(starterPictures.map((p) => p.label.toLowerCase())).size,
    ).toBe(30);
    expect(new Set(starterPictures.map((p) => p.category)).size).toBe(5);
  });
  it("combines custom pictures and excludes hidden or unrelated pictures", () => {
    const l = newEliLibrary();
    l.pictures.push(photo);
    l.hidden.push("cat", photo.id);
    expect(allPictures(l)).toHaveLength(31);
    expect(playablePictures(l)).toHaveLength(29);
    expect(playablePictures(l, "Animals")).toHaveLength(5);
    expect(playablePictures(l, "My pictures")).toHaveLength(0);
  });
  it("always includes the correct picture exactly once, without repeated choices", () => {
    for (let i = 0; i < 100; i++) {
      const q = recognitionQuestion(starterPictures, 4);
      expect(q.options).toHaveLength(4);
      expect(q.options.filter((p) => p.id === q.target.id)).toHaveLength(1);
      expect(new Set(q.options.map((p) => p.id)).size).toBe(4);
    }
  });
  it("doesn't repeat the previous target and limits choices to the available pool", () => {
    const pool = starterPictures.slice(0, 2);
    const q = recognitionQuestion(pool, 4, pool[0].id);
    expect(q.target.id).toBe(pool[1].id);
    expect(q.options).toHaveLength(2);
    expect(() => recognitionQuestion(pool.slice(0, 1), 2)).toThrow(
      /at least two/,
    );
  });
  it("validates picture backups and strips unexpected fields", () => {
    const exported = backup();
    const restored = validateEliBackup({
      ...exported,
      library: { ...exported.library, unexpected: "ignore" },
    });
    expect(restored.pictures[0]).toEqual(photo);
    expect(restored).not.toHaveProperty("unexpected");
    expect(restored).not.toBe(exported.library);
  });
  it("rejects scriptable, remote, invalid and oversized images", () => {
    for (const image of [
      "javascript:alert(1)",
      "https://example.com/photo.jpg",
      "data:image/svg+xml;base64,PHN2Zz4=",
      "data:image/jpeg;base64,?",
      "data:image/jpeg;base64," + "A".repeat(500001),
    ]) {
      const exported = backup();
      exported.library.pictures[0] = { ...photo, image };
      expect(() => validateEliBackup(exported)).toThrow(/invalid picture/);
    }
  });
  it("rejects duplicate ids, blank names, unknown categories and hidden references", () => {
    const invalid = [
      { ...backup().library, pictures: [photo, photo] },
      { ...backup().library, pictures: [{ ...photo, label: " " }] },
      { ...backup().library, pictures: [{ ...photo, category: "unknown" }] },
      { ...backup().library, hidden: ["unknown"] },
      { ...backup().library, choices: 20 },
    ];
    for (const library of invalid)
      expect(() =>
        validateEliBackup({ format: "gamehub-eli", version: 1, library }),
      ).toThrow();
    expect(() => validateEliBackup({ format: "gamehub", version: 1 })).toThrow(
      /Eli Zone/,
    );
  });
});
describe("Eli Zone offline storage", () => {
  beforeEach(async () => {
    await eliDb.library.clear();
    await initializeEli();
  });
  it("keeps pictures, selections and choice settings after reopen", async () => {
    await updateEli((l) => {
      l.pictures.push(photo);
      l.hidden.push("dog");
      l.choices = 4;
      l.showWords = true;
      l.palette = "rose";
    });
    eliDb.close();
    await eliDb.open();
    const saved = (await eliDb.library.get("main"))!;
    expect(saved.pictures).toEqual([photo]);
    expect(saved.hidden).toEqual(["dog"]);
    expect(saved.choices).toBe(4);
    expect(saved.showWords).toBe(true);
    expect(saved.palette).toBe("rose");
    await initializeEli();
    expect((await eliDb.library.get("main"))!.pictures).toEqual([photo]);
  });
  it("does not put personal photos in family game or cloud snapshots", async () => {
    await initialize();
    await updateEli((l) => l.pictures.push(photo));
    const exported = await exportState();
    expect(exported).not.toContain(photo.image);
    expect(exported).not.toContain(photo.id);
    expect(db.name).not.toBe(eliDb.name);
  });
  it("serializes concurrent additions without losing pictures", async () => {
    await Promise.all(
      Array.from({ length: 10 }, (_, i) =>
        updateEli((l) =>
          l.pictures.push({
            ...photo,
            id: `custom:test-${i}`,
            label: `Toy ${i}`,
          }),
        ),
      ),
    );
    expect((await eliDb.library.get("main"))!.pictures).toHaveLength(10);
  });
});
