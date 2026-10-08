import "fake-indexeddb/auto";
import { describe, it, expect, vi } from "vitest";
import {
  dealUno,
  drawUno,
  placeUno,
  readyUno,
  unoDeck,
  validUno,
  type UnoGame,
} from "./uno";
import { db, initialize, update, exportState, validateBackup } from "./db";
vi.mock(import("./random"), async (importOriginal) => ({
  ...(await importOriginal()),
  shuffle: <T>(items: T[]) => [...items],
}));

function cardInSlot(g: UnoGame, slot: number, number: number) {
  const index = g.deck.findIndex((c) => c.number === number);
  const old = g.players[0].slots[slot].card;
  g.players[0].slots[slot].card = g.deck[index];
  g.deck[index] = old;
}
function nextDraw(g: UnoGame, number: number) {
  const index = g.deck.findIndex((c) => c.number === number);
  g.deck.push(g.deck.splice(index, 1)[0]);
}
describe("Uno solitaire house rules", () => {
  it("deals a complete number-only deck with separate face-down boards", () => {
    const deck = unoDeck();
    expect(deck).toHaveLength(76);
    expect(new Set(deck.map((c) => c.id)).size).toBe(76);
    expect(deck.filter((c) => c.number === 0)).toHaveLength(4);
    expect(deck.filter((c) => c.number === 9)).toHaveLength(8);
    const g = dealUno(["Alex", "Sam"]);
    expect(g.deck).toHaveLength(56);
    expect(
      g.players.every(
        (p) => p.slots.length === 10 && p.slots.every((s) => !s.locked),
      ),
    ).toBe(true);
    expect(g.players[0].slots).not.toBe(g.players[1].slots);
    expect(validUno(g)).toBe(true);
  });
  it("chains swaps and ends the turn on a revealed duplicate", () => {
    const g = dealUno(["Alex", "Sam"]);
    cardInSlot(g, 2, 3);
    cardInSlot(g, 3, 2);
    nextDraw(g, 2);
    drawUno(g);
    expect(g.pending?.number).toBe(2);
    placeUno(g, 2);
    expect(g.players[0].slots[2].locked).toBe(true);
    expect(g.pending?.number).toBe(3);
    expect(g.current).toBe(0);
    expect(validUno(g)).toBe(true);
    placeUno(g, 3);
    expect(g.pending).toBeNull();
    expect(g.discard.at(-1)?.number).toBe(2);
    expect(g.current).toBe(1);
    expect(g.phase).toBe("handoff");
    expect(g.turns).toBe(2);
    expect(validUno(g)).toBe(true);
    readyUno(g);
    expect(g.phase).toBe("draw");
  });
  it("ends a turn when the drawn number is already in place, regardless of colour", () => {
    const g = dealUno(["Alex", "Sam"]);
    cardInSlot(g, 4, 4);
    g.players[0].slots[4].locked = true;
    g.placements = 1;
    const otherColour = g.deck.findIndex(
      (c) => c.number === 4 && c.color !== g.players[0].slots[4].card.color,
    );
    g.deck.push(g.deck.splice(otherColour, 1)[0]);
    expect(g.deck.at(-1)?.color).not.toBe(g.players[0].slots[4].card.color);
    drawUno(g);
    expect(g.phase).toBe("handoff");
    expect(g.current).toBe(1);
    expect(g.players[0].slots[4].locked).toBe(true);
    expect(validUno(g)).toBe(true);
  });
  it("rejects a wrong slot without altering the game and ignores moves in the wrong phase", () => {
    const g = dealUno(["Alex", "Sam"]);
    nextDraw(g, 5);
    drawUno(g);
    const held = structuredClone(g);
    drawUno(g);
    readyUno(g);
    expect(g).toEqual(held);
    expect(() => placeUno(g, 3)).toThrow(/slot 5/);
    expect(g).toEqual(held);
  });
  it("wins on the tenth placement and conserves every card", () => {
    const g = dealUno(["Alex", "Sam"]);
    for (let i = 0; i < 9; i++) {
      cardInSlot(g, i, i);
      g.players[0].slots[i].locked = true;
    }
    g.placements = 9;
    nextDraw(g, 9);
    drawUno(g);
    placeUno(g, 9);
    expect(g.winner).toBe(0);
    expect(g.phase).toBe("finished");
    expect(g.placements).toBe(10);
    expect(validUno(g)).toBe(true);
    const finished = structuredClone(g);
    drawUno(g);
    placeUno(g, 9);
    readyUno(g);
    expect(g).toEqual(finished);
  });
  it("recycles only discarded cards when the draw pile runs out", () => {
    const g = dealUno(["Alex", "Sam"]);
    g.discard.push(...g.deck);
    g.deck = [];
    drawUno(g);
    expect(g.deck).toHaveLength(55);
    expect(g.discard).toHaveLength(0);
    expect(validUno(g)).toBe(true);
  });
  it("lets solo players begin another turn after a duplicate", () => {
    const g = dealUno(["Alex"]);
    cardInSlot(g, 0, 0);
    g.players[0].slots[0].locked = true;
    g.placements = 1;
    nextDraw(g, 0);
    drawUno(g);
    expect(g.current).toBe(0);
    expect(g.turns).toBe(2);
    expect(g.phase).toBe("handoff");
    readyUno(g);
    expect(g.phase).toBe("draw");
    expect(validUno(g)).toBe(true);
  });
  it("validates player names and rejects corrupt boards, cards and phases", () => {
    expect(() => dealUno([])).toThrow();
    expect(() => dealUno([" "])).toThrow();
    expect(() => dealUno(["Alex", "Sam", "Jamie"])).toThrow();
    expect(() => dealUno(["a".repeat(25)])).toThrow();
    const g = dealUno(["Alex", "Sam"]);
    expect(validUno({ ...g, phase: "place" })).toBe(false);
    expect(validUno({ ...g, winner: 0 })).toBe(false);
    expect(validUno({ ...g, placements: 1 })).toBe(false);
    const bad = structuredClone(g);
    bad.deck[0].id = bad.deck[1].id;
    expect(validUno(bad)).toBe(false);
    expect(validUno(null)).toBe(false);
  });
  it("saves a held card through reload and backup without changing family scores", async () => {
    await db.state.clear();
    await initialize();
    await update((s) => {
      s.uno = dealUno(["Alex", "Sam"]);
      nextDraw(s.uno, 5);
      drawUno(s.uno);
    });
    db.close();
    await db.open();
    const saved = (await db.state.get("main"))!;
    expect(saved.uno?.pending?.number).toBe(5);
    expect(saved.players).toEqual([]);
    const file = JSON.parse(await exportState());
    expect(validateBackup(file).uno).toEqual(saved.uno);
    file.state.uno.current = 9;
    expect(() => validateBackup(file)).toThrow(/invalid Uno/);
    delete file.state.uno;
    expect(validateBackup(file).uno).toBeUndefined();
  });
});
