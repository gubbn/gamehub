import { describe, expect, it } from "vitest";
import { boardWinner, chooseComputerMove, type Square } from "./noughts-crosses";

describe("Noughts and Crosses", () => {
  it("finds row, diagonal and draw outcomes", () => {
    expect(boardWinner(["X", "X", "X", null, "O", null, "O", null, null])).toBe("X");
    expect(boardWinner(["O", "X", null, "X", "O", null, null, null, "O"])).toBe("O");
    expect(boardWinner(["X", "O", "X", "X", "O", "O", "O", "X", "X"])).toBe("draw");
  });

  it("takes a win before blocking the player", () => {
    const board: Square[] = ["O", "O", null, "X", "X", null, null, null, null];
    expect(chooseComputerMove(board)).toBe(2);
  });

  it("blocks a win and otherwise prefers the centre", () => {
    expect(chooseComputerMove(["X", "X", null, null, "O", null, null, null, null])).toBe(2);
    expect(chooseComputerMove(["X", null, null, null, null, null, null, null, null])).toBe(4);
  });
});
