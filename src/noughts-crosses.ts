export type Mark = "X" | "O";
export type Square = Mark | null;

export const winningLines = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
] as const;

export function boardWinner(board: Square[]): Mark | "draw" | null {
  for (const [a, b, c] of winningLines) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a];
    }
  }
  return board.every(Boolean) ? "draw" : null;
}

function finishingMove(board: Square[], mark: Mark) {
  return board.findIndex((square, index) => {
    if (square) return false;
    const trial = [...board];
    trial[index] = mark;
    return boardWinner(trial) === mark;
  });
}

export function chooseComputerMove(
  board: Square[],
  random: () => number = Math.random,
) {
  const win = finishingMove(board, "O");
  if (win >= 0) return win;
  const block = finishingMove(board, "X");
  if (block >= 0) return block;
  if (!board[4]) return 4;

  const corners = [0, 2, 6, 8].filter((index) => !board[index]);
  if (corners.length) return corners[Math.floor(random() * corners.length)];
  const open = board
    .map((square, index) => (square ? -1 : index))
    .filter((index) => index >= 0);
  return open.length ? open[Math.floor(random() * open.length)] : -1;
}
