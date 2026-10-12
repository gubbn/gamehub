import { describe, expect, it } from "vitest";
import {
  missedLetters,
  nextIndex,
  normaliseHangmanWord,
  pickRpsChoice,
  resolveRps,
  solvedWord,
  wouldYouRatherQuestions,
  wordLetters,
} from "./party-games";

describe("party game helpers", () => {
  it("normalises custom Hangman answers without losing word separators", () => {
    expect(normaliseHangmanWord("  Spider-man's  web!  ")).toBe(
      "SPIDER-MAN'S WEB",
    );
    expect([...wordLetters("ICE CREAM")]).toEqual([
      "I",
      "C",
      "E",
      "R",
      "A",
      "M",
    ]);
  });

  it("counts unique misses and solves phrases", () => {
    expect(missedLetters("WATER PARK", ["A", "Z", "Z", "Q"])).toEqual([
      "Z",
      "Q",
    ]);
    expect(solvedWord("A-B", ["A", "B"])).toBe(true);
    expect(solvedWord("A-B", ["A"])).toBe(false);
  });

  it("moves to a different random item when a pack has choices", () => {
    expect(nextIndex(5, 2, () => 0)).toBe(0);
    expect(nextIndex(5, 2, () => 0.99)).toBe(4);
    expect(nextIndex(1, 0, () => 0.5)).toBe(0);
  });

  it("keeps 60 distinct Would You Rather questions in each audience", () => {
    for (const questions of Object.values(wouldYouRatherQuestions)) {
      expect(questions).toHaveLength(60);
      expect(new Set(questions.map(({ left, right }) => `${left}|${right}`)).size).toBe(60);
      expect(questions.every(({ left, right }) => left !== right)).toBe(true);
    }
  });

  it("resolves every rock paper scissors outcome", () => {
    expect(resolveRps("rock", "scissors")).toBe("win");
    expect(resolveRps("paper", "scissors")).toBe("lose");
    expect(resolveRps("scissors", "scissors")).toBe("draw");
    expect(pickRpsChoice(() => 0)).toBe("rock");
    expect(pickRpsChoice(() => 0.999)).toBe("scissors");
  });
});
