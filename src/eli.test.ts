import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import {
  allPictures,
  bundledPictures,
  eliPacks,
  eliChoiceCounts,
  colourQuestion,
  matchingCards,
  packPictures,
  practicePictures,
  setEliPack,
  newEliLibrary,
  playablePictures,
  recognitionQuestion,
  recognitionWord,
  starterPictures,
  validateEliBackup,
  yesNoQuestion,
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
  it("offers six accurate expansion packs with unique cards and vocabulary", () => {
    expect(eliPacks.map((p) => p.ids.length)).toEqual([
      24, 10, 26, 21, 11, 100,
    ]);
    expect(bundledPictures).toHaveLength(168);
    expect(new Set(bundledPictures.map((p) => p.id)).size).toBe(168);
    expect(
      new Set(bundledPictures.map((p) => p.label.toLowerCase())).size,
    ).toBe(168);
    for (const pack of eliPacks) {
      expect(new Set(pack.ids).size).toBe(pack.ids.length);
      expect(packPictures(pack.id).every(Boolean)).toBe(true);
      expect(pack.previews.every((id) => pack.ids.includes(id as never))).toBe(
        true,
      );
    }
    expect(packPictures("unknown")).toEqual([]);
    expect(packPictures("basic-words").every((p) => !!p.asset)).toBe(true);
    expect(packPictures("numbers").map((p) => p.symbol)).toEqual(
      Array.from({ length: 21 }, (_, n) => String(n)),
    );
  });
  it("keeps expansions opt-in and deduplicates overlapping enabled packs", () => {
    const l = newEliLibrary();
    expect(l.enabledPacks).toEqual([]);
    expect(allPictures(l)).toHaveLength(30);
    setEliPack(l, "animals", true);
    expect(allPictures(l)).toHaveLength(48);
    setEliPack(l, "basic-words", true);
    setEliPack(l, "animals", true);
    expect(allPictures(l)).toHaveLength(106);
    expect(l.enabledPacks).toEqual(["animals", "basic-words"]);
    for (const p of eliPacks) setEliPack(l, p.id, true);
    expect(allPictures(l)).toHaveLength(168);
  });
  it("filters practice packs and preserves exclusions when packs are switched", () => {
    const l = newEliLibrary();
    setEliPack(l, "animals", true);
    l.hidden.push("cow");
    expect(playablePictures(l, "All pictures", "animals")).toHaveLength(23);
    expect(practicePictures(l, "All pictures", "starter")).toHaveLength(30);
    expect(playablePictures(l, "Food", "animals")).toHaveLength(0);
    setEliPack(l, "animals", false);
    expect(allPictures(l).some((p) => p.id === "cow")).toBe(false);
    expect(playablePictures(l, "All pictures", "animals")).toHaveLength(6);
    setEliPack(l, "animals", true);
    expect(l.hidden).toEqual(["cow"]);
    expect(
      playablePictures(l, "All pictures", "animals").some(
        (p) => p.id === "cow",
      ),
    ).toBe(false);
  });
  it("preserves personal pictures when a new pack has the same word", () => {
    const l = newEliLibrary();
    l.pictures.push({ ...photo, label: "Ball" });
    setEliPack(l, "basic-words", true);
    const balls = allPictures(l).filter(
      (p) => p.label.toLowerCase() === "ball",
    );
    expect(balls).toEqual([{ ...photo, label: "Ball" }]);
    expect(
      practicePictures(l, "All pictures", "basic-words").filter(
        (p) => p.label === "Ball",
      ),
    ).toEqual(balls);
    expect(practicePictures(l, "All pictures", "basic-words")).toHaveLength(
      100,
    );
  });
  it("uses clear letter, number and colour prompts without changing object words", () => {
    expect(recognitionWord(packPictures("letters")[0])).toBe("letter A");
    expect(recognitionWord(packPictures("numbers")[0])).toBe("number 0");
    expect(recognitionWord(packPictures("colours")[0])).toBe("red colour");
    expect(recognitionWord(starterPictures[0])).toBe("cat");
  });
  it("accepts old backups and validates expansion settings and hidden pack cards", () => {
    const old = backup();
    delete old.library.enabledPacks;
    expect(validateEliBackup(old).enabledPacks).toEqual([]);
    const l = { ...newEliLibrary(), hidden: bundledPictures.map((p) => p.id) };
    setEliPack(l, "letters", true);
    expect(
      validateEliBackup({ format: "gamehub-eli", version: 1, library: l })
        .enabledPacks,
    ).toEqual(["letters"]);
    for (const enabledPacks of [["bad"], ["letters", "letters"], "letters"]) {
      expect(() =>
        validateEliBackup({
          ...old,
          library: { ...old.library, enabledPacks },
        }),
      ).toThrow();
    }
  });
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
  it.each(eliChoiceCounts)(
    "offers %i tiles with the correct picture exactly once and no repeats",
    (choices) => {
      for (let i = 0; i < 100; i++) {
        const q = recognitionQuestion(starterPictures, choices);
        expect(q.options).toHaveLength(choices);
        expect(q.options.filter((p) => p.id === q.target.id)).toHaveLength(1);
        expect(new Set(q.options.map((p) => p.id)).size).toBe(choices);
      }
    },
  );
  it.each([2, 5, 9, 10])(
    "caps ten choices to a pool of %i pictures",
    (size) => {
      const pool = starterPictures.slice(0, size);
      const q = recognitionQuestion(pool, 10, pool[0].id);
      expect(q.options).toHaveLength(size);
      expect(q.target.id).not.toBe(pool[0].id);
      expect(new Set(q.options.map((p) => p.id)).size).toBe(size);
    },
  );
  it.each(eliChoiceCounts)(
    "round-trips backups with %i tiles, including old settings",
    (choices) => {
      const exported = backup();
      exported.library.choices = choices;
      expect(
        validateEliBackup(JSON.parse(JSON.stringify(exported))).choices,
      ).toBe(choices);
    },
  );
  it.each([0, 1, 11, 20, 2.5, NaN, Infinity, "10", null, undefined])(
    "rejects invalid tile count %s in questions and backups",
    (choices) => {
      expect(() =>
        recognitionQuestion(starterPictures, choices as number),
      ).toThrow(/between 2 and 10/);
      expect(() =>
        validateEliBackup({
          ...backup(),
          library: { ...backup().library, choices },
        }),
      ).toThrow(/valid Eli Zone/);
    },
  );
  it("doesn't repeat the previous target and limits choices to the available pool", () => {
    const pool = starterPictures.slice(0, 2);
    const q = recognitionQuestion(pool, 4, pool[0].id);
    expect(q.target.id).toBe(pool[1].id);
    expect(q.options).toHaveLength(2);
    expect(() => recognitionQuestion(pool.slice(0, 1), 2)).toThrow(
      /at least two/,
    );
  });
  it("builds a shuffled matching game with every picture appearing twice", () => {
    const cards = matchingCards(starterPictures, 3);
    expect(cards).toHaveLength(6);
    expect(new Set(cards.map((card) => card.key)).size).toBe(6);
    const counts = cards.reduce<Record<string, number>>((all, card) => {
      all[card.picture.id] = (all[card.picture.id] ?? 0) + 1;
      return all;
    }, {});
    expect(Object.values(counts)).toEqual([2, 2, 2]);
    expect(() => matchingCards(starterPictures.slice(0, 1))).toThrow(/two/);
  });
  it("creates accurate yes-or-no prompts and avoids the previous picture", () => {
    const yes = yesNoQuestion(starterPictures, starterPictures[0].id, () => 0);
    expect(yes.target.id).not.toBe(starterPictures[0].id);
    expect(yes.word).toBe(recognitionWord(yes.target));
    expect(yes.answer).toBe(true);
    const no = yesNoQuestion(starterPictures, undefined, () => 0.9);
    expect(no.word).not.toBe(recognitionWord(no.target));
    expect(no.answer).toBe(false);
    expect(() => yesNoQuestion(starterPictures.slice(0, 1))).toThrow(/two/);
  });
  it("offers three exact colour swatches without repeating the target", () => {
    const first = colourQuestion();
    const next = colourQuestion(first.target.id);
    expect(first.options).toHaveLength(3);
    expect(first.options.every((picture) => picture.kind === "colour")).toBe(true);
    expect(next.target.id).not.toBe(first.target.id);
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
      l.choices = 10;
      l.showWords = true;
      l.palette = "rose";
      setEliPack(l, "letters", true);
    });
    eliDb.close();
    await eliDb.open();
    const saved = (await eliDb.library.get("main"))!;
    expect(saved.pictures).toEqual([photo]);
    expect(saved.hidden).toEqual(["dog"]);
    expect(saved.choices).toBe(10);
    expect(saved.showWords).toBe(true);
    expect(saved.palette).toBe("rose");
    expect(saved.enabledPacks).toEqual(["letters"]);
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
