import Dexie, { type EntityTable } from "dexie";
import { initialState, type State } from "./engine";
import type { Card } from "./random";
function validCard(card: unknown): card is Card {
  const c = card as Card;
  return (
    !!c &&
    Number.isInteger(c.rank) &&
    c.rank >= 1 &&
    c.rank <= 13 &&
    ["♠", "♥", "♦", "♣"].includes(c.suit)
  );
}
export const db = new Dexie("gamehub-v1") as Dexie & {
  state: EntityTable<State, "key">;
};
db.version(1).stores({ state: "key" });
export async function initialize() {
  await db.transaction("rw", db.state, async () => {
    if (!(await db.state.get("main"))) await db.state.put(initialState());
  });
}
export async function update(mutate: (state: State) => void) {
  await db.transaction("rw", db.state, async () => {
    const state = await db.state.get("main");
    if (!state) throw new Error("GameHub is still loading.");
    mutate(state);
    state.revision++;
    await db.state.put(state);
  });
}
export async function exportState() {
  const state = await db.state.get("main");
  if (!state) throw new Error("No saved games to export.");
  return JSON.stringify({ format: "gamehub", version: 1, state }, null, 2);
}
export function validateBackup(value: unknown): State {
  const root = value as { format?: string; version?: number; state?: State };
  const s = root?.state;
  if (
    root?.format !== "gamehub" ||
    root.version !== 1 ||
    !s ||
    s.key !== "main" ||
    !Array.isArray(s.players) ||
    s.players.length > 12 ||
    !Array.isArray(s.rounds) ||
    s.rounds.length > 10000 ||
    !Array.isArray(s.sessions) ||
    !s.sessions.length ||
    !s.settings ||
    !["kids", "family", "adults", "mixed"].includes(s.settings.pack) ||
    !Array.isArray(s.installed) ||
    !Array.isArray(s.custom) ||
    !Array.isArray(s.toolDeck) ||
    !Array.isArray(s.toolDice) ||
    !s.toolTimer ||
    typeof s.toolLetter !== "string" ||
    s.toolLetter.length !== 1 ||
    (s.toolNumber !== null && !Number.isSafeInteger(s.toolNumber)) ||
    !Number.isFinite(s.numberMin) ||
    !Number.isFinite(s.numberMax) ||
    s.toolDice.length < 1 ||
    s.toolDice.length > 3 ||
    s.toolDice.some((v) => !Number.isInteger(v) || v < 1 || v > 6) ||
    s.toolDeck.length > 52 ||
    s.toolDeck.some((c) => !validCard(c)) ||
    (s.toolCard !== null && !validCard(s.toolCard)) ||
    !s.installed.includes("family") ||
    s.installed.some((id) => !["family", "kids", "adults"].includes(id)) ||
    s.custom.length > 500
  )
    throw new Error("This is not a valid GameHub backup.");
  if (
    s.players.some(
      (p) =>
        typeof p.id !== "string" ||
        typeof p.name !== "string" ||
        p.name.length > 24 ||
        typeof p.avatar !== "string" ||
        !Number.isSafeInteger(p.score),
    ) ||
    new Set(s.players.map((p) => p.id)).size !== s.players.length ||
    s.custom.some((c) => typeof c !== "string" || c.length > 150) ||
    s.sessions.some(
      (x) =>
        typeof x.id !== "string" ||
        typeof x.name !== "string" ||
        typeof x.startedAt !== "string",
    ) ||
    !s.sessions.some((x) => x.id === s.sessionId)
  )
    throw new Error("The backup contains invalid players or sessions.");
  const ids = new Set(s.players.map((p) => p.id));
  if (
    s.rounds.some(
      (r) =>
        typeof r.id !== "string" ||
        !["quick-stop", "charades", "who-am-i", "higher-lower"].includes(
          r.game,
        ) ||
        !["active", "finished", "cancelled"].includes(r.status) ||
        typeof r.prompt !== "string" ||
        !Array.isArray(r.players) ||
        !Array.isArray(r.active) ||
        !Array.isArray(r.answers) ||
        typeof r.letter !== "string" ||
        typeof r.createdAt !== "string" ||
        r.answers.some(
          (a) =>
            !a || typeof a.player !== "string" || typeof a.text !== "string",
        ) ||
        (r.deck !== undefined &&
          (!Array.isArray(r.deck) ||
            r.deck.length > 52 ||
            r.deck.some((c) => !validCard(c)))) ||
        (r.card !== undefined && !validCard(r.card)) ||
        !Number.isFinite(r.duration) ||
        r.duration <= 0 ||
        !Number.isFinite(r.remaining) ||
        (r.status === "active" &&
          (!ids.has(r.current) || r.active.some((id) => !ids.has(id)))),
    ) ||
    ![5, 10, 15, 30].includes(s.settings.turnSeconds) ||
    ![10, 20, 0].includes(s.settings.target) ||
    typeof s.settings.easyLetters !== "boolean" ||
    typeof s.settings.challenges !== "boolean" ||
    (s.activeRound !== null && !s.rounds.some((r) => r.id === s.activeRound)) ||
    !Number.isFinite(s.toolTimer.duration) ||
    s.toolTimer.duration <= 0 ||
    s.toolTimer.duration > 3600 ||
    !Number.isFinite(s.toolTimer.remaining) ||
    s.toolTimer.remaining < 0 ||
    s.toolTimer.remaining > s.toolTimer.duration
  )
    throw new Error("The backup contains invalid game state.");
  const copy = structuredClone(s);
  copy.id = crypto.randomUUID();
  copy.revision = 0;
  copy.lastBackupRevision = -1;
  copy.lastBackupAt = undefined;
  copy.rounds.forEach((r) => {
    r.deadline = null;
    delete r.challenge;
  });
  copy.toolTimer.deadline = null;
  return copy;
}
