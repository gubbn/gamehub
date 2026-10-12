import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import {
  initialState,
  addPlayer,
  startRound,
  acceptAnswer,
  eliminate,
  resolveChallenge,
  finishSession,
  newSession,
  guessCard,
  award,
  ensureFamilyPlayers,
  familyPlayerTemplates,
  type State,
} from "./engine";
import { newDeck, cardLabel, randomInt } from "./random";
import { categoriesFor, adultCategories, kidsCategories } from "./data";
function crew() {
  const s = initialState();
  s.players = [];
  ["Alex", "Sam", "Jamie"].forEach((name, i) =>
    addPlayer(s, name, ["🌞", "🦊", "🐼"][i]),
  );
  return s;
}
describe("offline gameplay", () => {
  let s: State;
  beforeEach(() => {
    s = crew();
  });
  afterEach(() => vi.useRealTimers());
  it("starts with the fixed family roster and preserves matching scores", () => {
    const family = initialState();
    expect(family.players.map((player) => player.name)).toEqual(
      familyPlayerTemplates.map((player) => player.name),
    );
    family.players = [
      { id: "existing-immy", name: "immy", avatar: "🐼", score: 12 },
      { id: "guest", name: "Guest", avatar: "🐸", score: 4 },
    ];
    expect(ensureFamilyPlayers(family)).toBe(true);
    expect(family.players).toHaveLength(6);
    expect(family.players.find((player) => player.name === "Immy")).toEqual({
      id: "existing-immy",
      name: "Immy",
      avatar: "🐼",
      score: 12,
    });
    expect(family.players.some((player) => player.name === "Guest")).toBe(false);
  });
  it("keeps a spoken-answer survivor in and advances to the next player", () => {
    vi.useFakeTimers();
    const r = startRound(s, "quick-stop");
    const first = r.current;
    const active = [...r.active];
    acceptAnswer(s, r, "");
    expect(r.answers).toEqual([{ player: first, text: "Spoken answer" }]);
    expect(r.active).toEqual(active);
    expect(r.current).toBe(s.players[1].id);
    expect(r.deadline).toBe(Date.now() + r.duration * 1000);
    expect(s.players.every((p) => p.score === 0)).toBe(true);
  });
  it("marks only the current player out and pauses the next turn", () => {
    const r = startRound(s, "quick-stop");
    const first = r.current;
    eliminate(s, r, first);
    expect(r.active).not.toContain(first);
    expect(r.active).toHaveLength(2);
    expect(r.current).toBe(s.players[1].id);
    expect(r.deadline).toBeNull();
    expect(r.answers).toHaveLength(0);
  });
  it("eliminates players and awards the last player exactly once", () => {
    const r = startRound(s, "quick-stop");
    eliminate(s, r, s.players[0].id);
    eliminate(s, r, s.players[1].id);
    expect(r.winner).toBe(s.players[2].id);
    expect(s.players[2].score).toBe(1);
    eliminate(s, r, s.players[1].id);
    award(s, r, s.players[2].id);
    expect(s.players[2].score).toBe(1);
  });
  it("rejects repeated answers and answers with the wrong letter", () => {
    const r = startRound(s, "quick-stop");
    r.letter = "B";
    acceptAnswer(s, r, "Banana");
    expect(() => acceptAnswer(s, r, " banana ")).toThrow(/already been used/);
    expect(() => acceptAnswer(s, r, "Apple")).toThrow(/begin with B/);
    expect(r.answers).toHaveLength(1);
  });
  it("does not accept an answer after the saved deadline", () => {
    vi.useFakeTimers();
    const r = startRound(s, "quick-stop");
    r.deadline = Date.now() - 1;
    acceptAnswer(s, r, `${r.letter} answer`);
    expect(r.active).not.toContain(s.players[0].id);
    expect(r.answers).toHaveLength(0);
    expect(r.deadline).toBeNull();
  });
  it("eliminates the answerer on a successful challenge", () => {
    const r = startRound(s, "quick-stop");
    acceptAnswer(s, r, "");
    r.challenge = { previous: s.players[0].id, challenger: s.players[2].id };
    resolveChallenge(s, r, true);
    expect(r.active).not.toContain(s.players[0].id);
    expect(r.current).toBe(s.players[1].id);
    expect(r.challenge).toBeUndefined();
  });
  it("eliminates the challenger and advances the turn on a failed challenge", () => {
    const r = startRound(s, "quick-stop");
    acceptAnswer(s, r, "");
    r.challenge = { previous: s.players[0].id, challenger: s.players[1].id };
    resolveChallenge(s, r, false);
    expect(r.active).toContain(s.players[0].id);
    expect(r.active).not.toContain(s.players[1].id);
    expect(r.current).toBe(s.players[2].id);
  });
  it("keeps categories and letters out of the recent repeat pool", () => {
    const prompts = new Set<string>(),
      letters = new Set<string>();
    for (let i = 0; i < 23; i++) {
      const r = startRound(s, "quick-stop");
      prompts.add(r.prompt);
      letters.add(r.letter);
      r.status = "cancelled";
    }
    expect(prompts.size).toBe(23);
    expect(letters.size).toBe(23);
  });
  it("rotates actors, saves a final scoreboard, and starts a fresh session", () => {
    const r = startRound(s, "charades");
    award(s, r, r.current);
    const next = startRound(s, "charades");
    expect(next.current).toBe(s.players[1].id);
    finishSession(s);
    expect(s.sessions[0].scores?.[0].score).toBe(1);
    expect(next.status).toBe("cancelled");
    newSession(s, "At the beach", true);
    expect(s.sessions).toHaveLength(2);
    expect(s.players[0].score).toBe(0);
    expect(s.sessions[0].scores?.[0].score).toBe(1);
  });
  it("compares ranks with aces low and treats ties as draws", () => {
    const r = startRound(s, "higher-lower");
    r.card = { rank: 1, suit: "♠" };
    r.deck = [{ rank: 2, suit: "♥" }];
    guessCard(s, r, "higher");
    expect(s.players[0].score).toBe(1);
    r.deck = [{ rank: 2, suit: "♣" }];
    guessCard(s, r, "lower");
    expect(s.players[1].score).toBe(0);
    expect(r.result).toMatch(/Same rank/);
  });
  it("keeps adult categories out of family and kids packs", () => {
    expect(kidsCategories).toHaveLength(60);
    expect(adultCategories).toHaveLength(80);
    expect(categoriesFor("family")).not.toContain("Dating apps");
    expect(categoriesFor("adults")).toContain("Dating apps");
    expect(categoriesFor("mixed")).toContain("Dating apps");
  });
});
describe("reusable game tools", () => {
  it("creates all 52 cards with no duplicates", () => {
    const deck = newDeck();
    expect(deck).toHaveLength(52);
    expect(new Set(deck.map(cardLabel)).size).toBe(52);
  });
  it("handles reversed ranges and refuses unusable ranges", () => {
    for (let i = 0; i < 100; i++)
      expect(randomInt(3, 1)).toBeGreaterThanOrEqual(1);
    expect(randomInt(6, 6)).toBe(6);
    expect(() => randomInt(NaN, 10)).toThrow();
    expect(() => randomInt(1, 1000002)).toThrow();
  });
});
