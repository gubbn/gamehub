import { useEffect, useMemo, useState } from "react";
import { Bot, Circle, RefreshCw, RotateCcw, UserRound, Users, X } from "lucide-react";
import { boardWinner, chooseComputerMove, winningLines, type Mark, type Square } from "./noughts-crosses";
import "./noughts-crosses.css";

type Mode = "solo" | "two-player";

export function NoughtsCrosses() {
  const [mode, setMode] = useState<Mode>("solo");
  const [board, setBoard] = useState<Square[]>(() => Array(9).fill(null));
  const [turn, setTurn] = useState<Mark>("X");
  const [score, setScore] = useState({ X: 0, O: 0, draws: 0 });
  const [thinking, setThinking] = useState(false);
  const result = boardWinner(board);
  const winningLine = useMemo(
    () =>
      result === "X" || result === "O"
        ? winningLines.find(([a, b, c]) => board[a] === result && board[b] === result && board[c] === result)
        : undefined,
    [board, result],
  );

  useEffect(() => {
    if (mode !== "solo" || turn !== "O" || result) return;
    setThinking(true);
    const timer = window.setTimeout(() => {
      setBoard((current) => {
        const move = chooseComputerMove(current);
        if (move < 0) return current;
        const next = [...current];
        next[move] = "O";
        return next;
      });
      setTurn("X");
      setThinking(false);
    }, 450);
    return () => window.clearTimeout(timer);
  }, [board, mode, result, turn]);

  useEffect(() => {
    if (!result) return;
    setScore((current) => ({
      ...current,
      ...(result === "draw"
        ? { draws: current.draws + 1 }
        : { [result]: current[result] + 1 }),
    }));
  }, [result]);

  function play(index: number) {
    if (board[index] || result || thinking || (mode === "solo" && turn === "O")) return;
    setBoard((current) => current.map((square, position) => (position === index ? turn : square)));
    setTurn(turn === "X" ? "O" : "X");
  }

  function newRound() {
    setBoard(Array(9).fill(null));
    setTurn("X");
    setThinking(false);
  }

  function changeMode(next: Mode) {
    setMode(next);
    setScore({ X: 0, O: 0, draws: 0 });
    newRound();
  }

  const status = result === "draw"
    ? "That round is a draw"
    : result
      ? mode === "solo"
        ? result === "X" ? "You win the round!" : "Computer wins the round"
        : `${result} wins the round!`
      : thinking
        ? "Computer is choosing…"
        : mode === "solo"
          ? "Your turn — you are X"
          : `${turn}'s turn`;

  return (
    <div className="nac-zone">
      <section className="nac-toolbar panel">
        <div>
          <span className="eyebrow">GAME MODE</span>
          <div className="segmented" aria-label="Number of players">
            <button className={mode === "solo" ? "active" : ""} aria-pressed={mode === "solo"} onClick={() => changeMode("solo")}>
              <UserRound size={17} /> One player
            </button>
            <button className={mode === "two-player" ? "active" : ""} aria-pressed={mode === "two-player"} onClick={() => changeMode("two-player")}>
              <Users size={17} /> Two players
            </button>
          </div>
        </div>
        <button className="secondary" onClick={() => { setScore({ X: 0, O: 0, draws: 0 }); newRound(); }}>
          <RotateCcw size={16} /> Reset match
        </button>
      </section>

      <section className="nac-game panel">
        <div className="nac-score" aria-label="Match score">
          <div className="x"><X size={22} /><span>{mode === "solo" ? "YOU" : "PLAYER X"}</span><strong>{score.X}</strong></div>
          <div><span>DRAWS</span><strong>{score.draws}</strong></div>
          <div className="o">{mode === "solo" ? <Bot size={22} /> : <Circle size={21} />}<span>{mode === "solo" ? "COMPUTER" : "PLAYER O"}</span><strong>{score.O}</strong></div>
        </div>

        <p className="nac-status" aria-live="polite">{status}</p>
        <div className="nac-board" role="grid" aria-label="Noughts and Crosses board">
          {board.map((square, index) => (
            <button
              key={index}
              role="gridcell"
              className={`${square ? square.toLocaleLowerCase() : ""} ${winningLine?.some((cell) => cell === index) ? "winner" : ""}`}
              aria-label={square ? `Square ${index + 1}: ${square}` : `Square ${index + 1}: empty`}
              disabled={!!square || !!result || thinking || (mode === "solo" && turn === "O")}
              onClick={() => play(index)}
            >
              {square === "X" ? <X size={54} strokeWidth={2.5} /> : square === "O" ? <Circle size={49} strokeWidth={2.5} /> : null}
            </button>
          ))}
        </div>

        {result && (
          <button className="primary" onClick={newRound}>
            Next round <RefreshCw size={17} />
          </button>
        )}
      </section>
    </div>
  );
}
