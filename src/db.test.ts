import "fake-indexeddb/auto";
import { beforeEach, describe, it, expect } from "vitest";
import { db, initialize, update, exportState, validateBackup } from "./db";
import { addPlayer, startRound, eliminate, activeRound } from "./engine";
beforeEach(async () => {
  await db.state.clear();
  await initialize();
});
describe("IndexedDB persistence", () => {
  it("persists answer controls and supports older backups without the preference", async () => {
    await update((s) => {
      s.settings.quickStopAnswerMode = "typed";
    });
    db.close();
    await db.open();
    expect((await db.state.get("main"))?.settings.quickStopAnswerMode).toBe(
      "typed",
    );
    const exported = JSON.parse(await exportState());
    expect(validateBackup(exported).settings.quickStopAnswerMode).toBe("typed");
    delete exported.state.settings.quickStopAnswerMode;
    expect(
      validateBackup(exported).settings.quickStopAnswerMode,
    ).toBeUndefined();
    exported.state.settings.quickStopAnswerMode = "invalid";
    expect(() => validateBackup(exported)).toThrow(/invalid game state/);
  });
  it("serializes concurrent score changes without losing points", async () => {
    await Promise.all(
      Array.from({ length: 20 }, () =>
        update((s) => {
          s.players[0].score++;
        }),
      ),
    );
    expect((await db.state.get("main"))?.players[0].score).toBe(20);
  });
  it("persists players, winners and scores through a database close/reopen", async () => {
    await update((s) => {
      s.players = [];
      addPlayer(s, "Alex", "🌞");
      addPlayer(s, "Sam", "🦊");
      const r = startRound(s, "quick-stop");
      eliminate(s, r, s.players[0].id);
    });
    db.close();
    await db.open();
    const saved = (await db.state.get("main"))!;
    expect(saved.players[1].score).toBe(1);
    expect(activeRound(saved)?.winner).toBe(saved.players[1].id);
  });
  it("round-trips backups and pauses restored running timers", async () => {
    await update((s) => {
      const r = startRound(s, "quick-stop");
      r.deadline = Date.now() + 5000;
      s.toolTimer.deadline = Date.now() + 60000;
    });
    const original = (await db.state.get("main"))!;
    const restored = validateBackup(JSON.parse(await exportState()));
    expect(restored.players).toEqual(original.players);
    expect(restored.id).not.toBe(original.id);
    expect(activeRound(restored)?.deadline).toBeNull();
    expect(restored.toolTimer.deadline).toBeNull();
  });
  it("rejects foreign and malformed backups before replacement", () => {
    expect(() => validateBackup({})).toThrow(/valid GameHub/);
    expect(() =>
      validateBackup({ format: "gamehub", version: 1, state: { players: [] } }),
    ).toThrow(/valid GameHub/);
  });
  it("rejects malformed game tools before restoring a backup", async () => {
    const exported = JSON.parse(await exportState());
    exported.state.toolDice = [99];
    expect(() => validateBackup(exported)).toThrow(/valid GameHub/);
    exported.state.toolDice = [1];
    exported.state.toolCard = { rank: 100, suit: "♠" };
    expect(() => validateBackup(exported)).toThrow(/valid GameHub/);
  });
});
