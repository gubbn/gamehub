import { useRef, useState } from "react";
import { Check, Layers, RotateCcw, Trophy } from "lucide-react";
import { update } from "./db";
import type { State } from "./engine";
import {
  dealUno,
  drawUno,
  placeUno,
  readyUno,
  type UnoCard,
  type UnoGame,
} from "./uno";
import "./uno.css";

function CardFace({ card }: { card: UnoCard }) {
  return (
    <span className={`uno-face uno-${card.color}`}>
      <small>{card.number}</small>
      <strong>{card.number}</strong>
      <small>{card.number}</small>
    </span>
  );
}
export function UnoZone({ state }: { state: State }) {
  const [mode, setMode] = useState<"duel" | "solo">("duel");
  const [names, setNames] = useState([
    state.players[0]?.name || "Player 1",
    state.players[1]?.name || "Player 2",
  ]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmNew, setConfirmNew] = useState(false);
  const actionRef = useRef(false);
  const game = state.uno;
  async function act(mutate: (s: State) => void) {
    if (actionRef.current) return;
    actionRef.current = true;
    setBusy(true);
    setError("");
    try {
      await update(mutate);
      setConfirmNew(false);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not save the move. Try again.",
      );
    } finally {
      actionRef.current = false;
      setBusy(false);
    }
  }
  const move = (mutate: (g: UnoGame) => void) =>
    act((s) => {
      if (s.uno?.id === game?.id) mutate(s.uno!);
    });
  const start = () =>
    act((s) => {
      s.uno = dealUno(names.slice(0, mode === "solo" ? 1 : 2));
    });
  return (
    <div className={`uno-zone ${game ? "playing" : ""}`}>
      <section className="uno-intro panel">
        <span className="eyebrow">NUMBER-CARD HOUSE RULES</span>
        <h2>Race to 0–9</h2>
        <p>
          Your two-row board. A lucky draw. A chain of swaps. Fill every slot
          before your opponent.
        </p>
        <details className="uno-rules">
          <summary>How to play · Uno solitaire</summary>
          <ol>
            <li>
              Each player gets ten face-down cards: slots 0–4 on top, 5–9
              underneath.
            </li>
            <li>
              Draw a card and tap its numbered slot. The new card stays face up;
              the card underneath is revealed.
            </li>
            <li>
              Place the revealed card in its own numbered slot and keep the
              chain going.
            </li>
            <li>
              If a drawn or revealed number is already face up in its correct
              slot, discard it and pass to the other player.
            </li>
            <li>
              The first player with all ten numbers in place wins. Colours don’t
              matter; action and wild cards are left out.
            </li>
          </ol>
          <p>
            Solo practice uses the same board; a duplicate starts your next
            turn. This is a house-rule variant, not official Uno gameplay. You
            can also use these rules with a physical number-card deck.
          </p>
        </details>
      </section>
      {error && (
        <p className="uno-error" role="alert">
          {error}
        </p>
      )}
      {!game ? (
        <section className="panel uno-setup">
          <h2>Choose your variant</h2>
          <div className="uno-variants" role="group" aria-label="Uno variants">
            <button
              aria-pressed={mode === "duel"}
              onClick={() => setMode("duel")}
            >
              <strong>Two-player solitaire</strong>
              <span>Race on separate boards</span>
            </button>
            <button
              aria-pressed={mode === "solo"}
              onClick={() => setMode("solo")}
            >
              <strong>Solo practice</strong>
              <span>Complete your own board</span>
            </button>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              start();
            }}
          >
            <div className="uno-names">
              {names.slice(0, mode === "solo" ? 1 : 2).map((name, i) => (
                <label key={i}>
                  Player {i + 1}
                  <input
                    value={name}
                    maxLength={24}
                    required
                    autoComplete="off"
                    onChange={(e) =>
                      setNames(
                        names.map((n, j) => (j === i ? e.target.value : n)),
                      )
                    }
                  />
                </label>
              ))}
            </div>
            <button className="primary" disabled={busy} type="submit">
              <Layers size={18} /> Deal the cards
            </button>
          </form>
          <p className="muted">
            No timer. Saved automatically on this device, including with your
            game backup. Family scores are unchanged.
          </p>
        </section>
      ) : (
        <section className="panel uno-table">
          <div className="uno-game-top">
            <span className="eyebrow">
              {game.players.length === 2
                ? "TWO-PLAYER SOLITAIRE"
                : "SOLO PRACTICE"}
            </span>
            <span>Turn {game.turns}</span>
          </div>
          <div className="uno-progress" aria-label="Player progress">
            {game.players.map((p, i) => (
              <div key={i} className={i === game.current ? "current" : ""}>
                <strong>{p.name}</strong>
                <span>
                  {p.slots.filter((s) => s.locked).length} / 10 in place
                </span>
              </div>
            ))}
          </div>
          <p className="uno-message" role="status" aria-live="polite">
            {game.message}
          </p>
          {game.phase === "handoff" ? (
            <div className="uno-handoff">
              <Layers size={40} />
              <h3>
                {game.players.length === 2
                  ? `Pass to ${game.players[game.current].name}`
                  : "Ready for your next turn?"}
              </h3>
              <p>
                {game.players.length === 2
                  ? "Their board stays hidden until they’re ready."
                  : "Your completed slots stay in place."}
              </p>
              <button
                className="primary"
                disabled={busy}
                onClick={() => move(readyUno)}
              >
                Ready, {game.players[game.current].name}
              </button>
            </div>
          ) : (
            <>
              <div className="uno-board-heading">
                <h3>{game.players[game.current].name}’s board</h3>
                <span>Left to right · 0–9</span>
              </div>
              <div
                className="uno-board"
                aria-label={`${game.players[game.current].name}’s card board`}
              >
                {game.players[game.current].slots.map((slot, i) => {
                  const target =
                    game.phase === "place" && game.pending?.number === i;
                  return (
                    <div className="uno-slot" key={i}>
                      <span className="uno-slot-label">
                        {i}{" "}
                        {slot.locked && <Check size={12} aria-hidden="true" />}
                      </span>
                      <button
                        className={`uno-card ${target ? "target" : ""}`}
                        disabled={!target || busy}
                        onClick={() => move((g) => placeUno(g, i))}
                        aria-label={
                          slot.locked
                            ? `Slot ${i}: ${i} in place`
                            : target
                              ? `Place ${i} in slot ${i}`
                              : `Slot ${i}: face down`
                        }
                      >
                        {slot.locked ? (
                          <CardFace card={slot.card} />
                        ) : (
                          <span className="uno-back">
                            <Layers aria-hidden="true" />
                            <span>?</span>
                          </span>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
              {game.phase === "finished" ? (
                <div className="uno-winner">
                  <Trophy size={32} />
                  <h3>{game.players[game.winner!].name} wins!</h3>
                  <p>All ten numbers in place · {game.turns} turns</p>
                  <button
                    className="primary"
                    disabled={busy}
                    onClick={() =>
                      act((s) => {
                        delete s.uno;
                      })
                    }
                  >
                    Choose another game
                  </button>
                </div>
              ) : (
                <div className="uno-draw-area">
                  <div className="uno-draw-stats">
                    <span>
                      <strong>{game.deck.length}</strong> to draw
                    </span>
                    <span>
                      <strong>{game.discard.length}</strong> discarded
                    </span>
                  </div>
                  {game.phase === "draw" ? (
                    <button
                      className="primary uno-draw"
                      disabled={busy}
                      onClick={() => move(drawUno)}
                    >
                      <Layers size={20} /> Draw a card
                    </button>
                  ) : (
                    <div className="uno-held">
                      <div className="uno-card">
                        <CardFace card={game.pending!} />
                      </div>
                      <div>
                        <span className="eyebrow">CARD TO PLACE</span>
                        <strong>Place {game.pending!.number}</strong>
                        <p>
                          Tap the highlighted slot to reveal the card
                          underneath.
                        </p>
                        <button
                          className="primary"
                          disabled={busy}
                          onClick={() =>
                            move((g) => placeUno(g, g.pending!.number))
                          }
                        >
                          Swap into slot {game.pending!.number}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
          {game.phase !== "finished" && (
            <div className="uno-new-game">
              {!confirmNew ? (
                <button
                  className="text-button"
                  onClick={() => setConfirmNew(true)}
                >
                  <RotateCcw size={15} /> New game
                </button>
              ) : (
                <div>
                  <p>
                    End this game and choose a new variant? Your current boards
                    will be replaced.
                  </p>
                  <button
                    className="secondary"
                    disabled={busy}
                    onClick={() => setConfirmNew(false)}
                  >
                    Keep playing
                  </button>
                  <button
                    className="text-button danger"
                    disabled={busy}
                    onClick={() =>
                      act((s) => {
                        delete s.uno;
                      })
                    }
                  >
                    End this game
                  </button>
                </div>
              )}
            </div>
          )}
        </section>
      )}
      <p className="uno-note">
        Uno-inspired number-card games · Original GameHub card art · Works
        offline once the app is cached.
      </p>
    </div>
  );
}
