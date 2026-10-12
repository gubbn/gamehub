import { describe, expect, it } from "vitest";
import {
  buildTriviaRound,
  triviaPool,
} from "./social-games";

describe("social game helpers", () => {
  it("builds unique trivia rounds from the requested category", () => {
    const questions = buildTriviaRound("science", 5, () => 0.4);
    expect(questions).toHaveLength(5);
    expect(new Set(questions.map((question) => question.id)).size).toBe(5);
    expect(questions.every((question) => question.category === "science")).toBe(true);
    expect(triviaPool("mixed").length).toBeGreaterThan(triviaPool("kids").length);
  });
});
