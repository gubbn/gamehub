import { describe, expect, it } from "vitest";
import { makeTimesQuestion, pointsForAnswer, timesTables } from "./immy";

describe("Immy Zone helpers", () => {
  it("offers every table from 2 through 12", () => {
    expect(timesTables).toEqual([2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  });

  it("builds questions only from selected tables", () => {
    expect(makeTimesQuestion([4, 9], undefined, () => 0)).toEqual({
      table: 4,
      multiplier: 1,
      answer: 4,
    });
    expect(makeTimesQuestion([4, 9], undefined, () => 0.999)).toEqual({
      table: 9,
      multiplier: 12,
      answer: 108,
    });
  });

  it("rewards a streak with a capped bonus", () => {
    expect(pointsForAnswer(0)).toBe(10);
    expect(pointsForAnswer(3)).toBe(16);
    expect(pointsForAnswer(99)).toBe(20);
  });
});
