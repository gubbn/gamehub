import { shuffle } from "./random";

export const unoColors = ["red", "yellow", "green", "blue"] as const;
export type UnoCard = {
  id: string;
  number: number;
  color: (typeof unoColors)[number];
};
export type UnoPlayer = {
  name: string;
  slots: { card: UnoCard; locked: boolean }[];
};
export type UnoGame = {
  id: string;
  players: UnoPlayer[];
  deck: UnoCard[];
  discard: UnoCard[];
  current: number;
  pending: UnoCard | null;
  phase: "draw" | "place" | "handoff" | "finished";
  turns: number;
  placements: number;
  message: string;
  winner: number | null;
};

export function unoDeck(): UnoCard[] {
  return shuffle(
    unoColors.flatMap((color) =>
      Array.from({ length: 10 }, (_, number) =>
        Array.from({ length: number === 0 ? 1 : 2 }, (_, copy) => ({
          id: `${color}-${number}-${copy}`,
          color,
          number,
        })),
      ).flat(),
    ),
  );
}
export function dealUno(names: string[]): UnoGame {
  if (
    names.length < 1 ||
    names.length > 2 ||
    names.some((name) => !name.trim() || name.trim().length > 24)
  )
    throw new Error(
      "Choose one or two player names, up to 24 characters each.",
    );
  const deck = unoDeck();
  return {
    id: crypto.randomUUID(),
    players: names.map((name) => ({
      name: name.trim(),
      slots: Array.from({ length: 10 }, () => ({
        card: deck.pop()!,
        locked: false,
      })),
    })),
    deck,
    discard: [],
    current: 0,
    pending: null,
    phase: "draw",
    turns: 1,
    placements: 0,
    winner: null,
    message: `${names[0].trim()}, draw a card to start.`,
  };
}
function holdUno(game: UnoGame, card: UnoCard, source: "Drawn" | "Revealed") {
  if (game.players[game.current].slots[card.number].locked) {
    game.discard.push(card);
    game.pending = null;
    const previous = game.players[game.current].name;
    game.current = (game.current + 1) % game.players.length;
    game.turns++;
    game.phase = "handoff";
    game.message = `${source} ${card.number} — already in place! ${previous}’s turn ends.`;
  } else {
    game.pending = card;
    game.phase = "place";
    game.message = `${source} ${card.number}. Swap it into slot ${card.number}, then use the card underneath.`;
  }
}
export function drawUno(game: UnoGame) {
  if (game.phase !== "draw") return;
  if (!game.deck.length) {
    game.deck = shuffle(game.discard);
    game.discard = [];
  }
  const card = game.deck.pop();
  if (!card) throw new Error("No cards available to draw.");
  holdUno(game, card, "Drawn");
}
export function placeUno(game: UnoGame, slotIndex: number) {
  if (game.phase !== "place" || !game.pending) return;
  if (
    slotIndex !== game.pending.number ||
    game.players[game.current].slots[slotIndex]?.locked
  )
    throw new Error(`Place this card in slot ${game.pending.number}.`);
  const slot = game.players[game.current].slots[slotIndex];
  const revealed = slot.card;
  slot.card = game.pending;
  slot.locked = true;
  game.pending = null;
  game.placements++;
  if (game.players[game.current].slots.every((s) => s.locked)) {
    game.discard.push(revealed);
    game.phase = "finished";
    game.winner = game.current;
    game.message = `${game.players[game.current].name} completed 0–9 and wins!`;
    return;
  }
  holdUno(game, revealed, "Revealed");
}
export function readyUno(game: UnoGame) {
  if (game.phase !== "handoff") return;
  game.phase = "draw";
  game.message = `${game.players[game.current].name}, draw a card to start your turn.`;
}

// Also used for backups: require a complete, consistent 76-card number deck.
export function validUno(value: unknown): value is UnoGame {
  const g = value as UnoGame;
  if (
    !g ||
    typeof g.id !== "string" ||
    !Array.isArray(g.players) ||
    g.players.length < 1 ||
    g.players.length > 2 ||
    !Array.isArray(g.deck) ||
    !Array.isArray(g.discard) ||
    !["draw", "place", "handoff", "finished"].includes(g.phase) ||
    !Number.isInteger(g.current) ||
    g.current < 0 ||
    g.current >= g.players.length ||
    !Number.isSafeInteger(g.turns) ||
    g.turns < 1 ||
    !Number.isSafeInteger(g.placements) ||
    g.placements < 0 ||
    typeof g.message !== "string" ||
    g.message.length > 300 ||
    !(
      g.winner === null ||
      (Number.isInteger(g.winner) &&
        g.winner === g.current &&
        g.phase === "finished")
    ) ||
    (g.phase === "finished") !== (g.winner !== null) ||
    (g.phase === "place") !== (g.pending !== null)
  )
    return false;
  const cards = [...g.deck, ...g.discard];
  for (const player of g.players) {
    if (
      !player ||
      typeof player.name !== "string" ||
      !player.name.trim() ||
      player.name.length > 24 ||
      !Array.isArray(player.slots) ||
      player.slots.length !== 10
    )
      return false;
    for (const [i, slot] of player.slots.entries()) {
      if (
        !slot ||
        typeof slot.locked !== "boolean" ||
        !slot.card ||
        (slot.locked && slot.card.number !== i)
      )
        return false;
      cards.push(slot.card);
    }
  }
  if (g.pending) cards.push(g.pending);
  if (
    cards.length !== 76 ||
    new Set(cards.map((c) => c?.id)).size !== 76 ||
    cards.some(
      (c) =>
        !c ||
        !unoColors.includes(c.color) ||
        !Number.isInteger(c.number) ||
        c.number < 0 ||
        c.number > 9 ||
        ![
          `${c.color}-${c.number}-0`,
          ...(c.number ? [`${c.color}-${c.number}-1`] : []),
        ].includes(c.id),
    )
  )
    return false;
  if (
    g.phase === "place" &&
    g.players[g.current].slots[g.pending!.number].locked
  )
    return false;
  if (
    g.phase === "finished" &&
    !g.players[g.current].slots.every((slot) => slot.locked)
  )
    return false;
  return (
    g.placements ===
    g.players.reduce(
      (sum, player) => sum + player.slots.filter((slot) => slot.locked).length,
      0,
    )
  );
}
