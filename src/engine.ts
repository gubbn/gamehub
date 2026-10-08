import {
  categoriesFor,
  charades,
  identities,
  type GameId,
  type PackId,
} from "./data";
import { letters, newDeck, nextUnused, pick, type Card } from "./random";
import type { UnoGame } from "./uno";
export type Player = {
  id: string;
  name: string;
  avatar: string;
  score: number;
};
export type Settings = {
  pack: PackId;
  easyLetters: boolean;
  turnSeconds: number;
  target: number;
  challenges: boolean;
  sound: boolean;
  quickStopAnswerMode?: "spoken" | "typed";
};
export type Round = {
  id: string;
  sessionId: string;
  game: GameId;
  pack: PackId;
  prompt: string;
  letter: string;
  players: string[];
  playerNames?: Record<string, string>;
  active: string[];
  current: string;
  answers: { player: string; text: string }[];
  status: "active" | "finished" | "cancelled";
  winner?: string;
  createdAt: string;
  duration: number;
  remaining: number;
  deadline: number | null;
  card?: Card;
  deck?: Card[];
  revealed?: boolean;
  challenge?: { previous: string; challenger: string };
  result?: string;
};
export type Session = {
  id: string;
  name: string;
  startedAt: string;
  endedAt?: string;
  scores?: { name: string; score: number; avatar: string }[];
};
export type State = {
  key: "main";
  id: string;
  revision: number;
  players: Player[];
  settings: Settings;
  installed: PackId[];
  custom: string[];
  rounds: Round[];
  activeRound: string | null;
  sessions: Session[];
  sessionId: string;
  toolDeck: Card[];
  toolCard: Card | null;
  toolLetter: string;
  toolDice: number[];
  toolNumber: number | null;
  numberMin: number;
  numberMax: number;
  toolTimer: { duration: number; remaining: number; deadline: number | null };
  lastBackupRevision: number;
  lastBackupAt?: string;
  uno?: UnoGame;
};
export function initialState(): State {
  const session = {
    id: crypto.randomUUID(),
    name: "Our holiday",
    startedAt: new Date().toISOString(),
  };
  return {
    key: "main",
    id: crypto.randomUUID(),
    revision: 0,
    players: [],
    settings: {
      pack: "family",
      easyLetters: true,
      turnSeconds: 5,
      target: 10,
      challenges: true,
      sound: false,
      quickStopAnswerMode: "spoken",
    },
    installed: ["family"],
    custom: [],
    rounds: [],
    activeRound: null,
    sessions: [session],
    sessionId: session.id,
    toolDeck: newDeck(),
    toolCard: null,
    toolLetter: "?",
    toolDice: [1],
    toolNumber: null,
    numberMin: 1,
    numberMax: 100,
    toolTimer: { duration: 60, remaining: 60, deadline: null },
    lastBackupRevision: -1,
  };
}
export function activeRound(s: State) {
  return s.rounds.find((r) => r.id === s.activeRound);
}
export function startRound(s: State, game: GameId) {
  const session = s.sessions.find((session) => session.id === s.sessionId);
  if (session?.endedAt) throw new Error("Start a new session before playing.");
  if (s.players.length < (game === "higher-lower" ? 1 : 2))
    throw new Error("Add at least two players to play together.");
  const old = activeRound(s);
  if (old?.status === "active")
    throw new Error("Finish or end your current round first.");
  const history = s.rounds.filter(
    (r) => r.game === game && r.pack === s.settings.pack,
  );
  const pool =
    game === "quick-stop"
      ? categoriesFor(s.settings.pack, s.custom)
      : game === "charades"
        ? charades
        : identities;
  const deck = newDeck(),
    card = game === "higher-lower" ? deck.pop() : undefined;
  const duration = game === "quick-stop" ? s.settings.turnSeconds : 60;
  const first =
    s.players[
      s.rounds.filter((r) => r.sessionId === s.sessionId).length %
        s.players.length
    ].id;
  const r: Round = {
    id: crypto.randomUUID(),
    sessionId: s.sessionId,
    game,
    pack: s.settings.pack,
    prompt:
      game === "higher-lower"
        ? "Will the next card be higher or lower?"
        : nextUnused(
            pool,
            history.slice(-(pool.length - 1)).map((r) => r.prompt),
          ),
    letter: nextUnused(
      letters(s.settings.easyLetters),
      history
        .slice(-(letters(s.settings.easyLetters).length - 1))
        .map((r) => r.letter),
    ),
    players: s.players.map((p) => p.id),
    playerNames: Object.fromEntries(s.players.map((p) => [p.id, p.name])),
    active: s.players.map((p) => p.id),
    current: first,
    answers: [],
    status: "active",
    createdAt: new Date().toISOString(),
    duration,
    remaining: duration,
    deadline: null,
    card,
    deck: game === "higher-lower" ? deck : undefined,
    revealed: false,
  };
  s.rounds.push(r);
  s.activeRound = r.id;
  return r;
}
export function pause(r: Round) {
  if (r.deadline !== null)
    r.remaining = Math.max(0, (r.deadline - Date.now()) / 1000);
  r.deadline = null;
}
export function toggleTimer(r: Round) {
  if (r.status !== "active" || r.challenge) return;
  if (r.deadline !== null) pause(r);
  else {
    if (r.remaining <= 0) r.remaining = r.duration;
    r.deadline = Date.now() + r.remaining * 1000;
  }
}
function nextPlayer(r: Round, from: string) {
  const index = r.players.indexOf(from);
  for (let step = 1; step <= r.players.length; step++) {
    const next = r.players[(index + step) % r.players.length];
    if (r.active.includes(next)) return next;
  }
  return from;
}
export function award(s: State, r: Round, playerId: string) {
  if (r.status !== "active") return;
  const player = s.players.find((p) => p.id === playerId);
  if (!player) throw new Error("Player not found.");
  player.score++;
  r.winner = playerId;
  r.status = "finished";
  r.deadline = null;
  r.challenge = undefined;
  r.result = `${player.name} wins the round!`;
}
export function eliminate(s: State, r: Round, playerId: string) {
  if (r.status !== "active" || !r.active.includes(playerId)) return;
  const previous = r.current;
  r.active = r.active.filter((id) => id !== playerId);
  r.deadline = null;
  r.remaining = r.duration;
  if (r.active.length === 1) {
    award(s, r, r.active[0]);
    return;
  }
  if (r.active.length === 0) {
    r.status = "finished";
    return;
  }
  if (playerId === previous) r.current = nextPlayer(r, previous);
}
export function acceptAnswer(s: State, r: Round, text: string) {
  if (r.status !== "active" || r.challenge) return;
  if (r.deadline !== null && r.deadline <= Date.now()) {
    eliminate(s, r, r.current);
    return;
  }
  const clean = text.trim();
  if (clean && r.game === "quick-stop") {
    if (!clean.toLocaleUpperCase().startsWith(r.letter))
      throw new Error(`The answer must begin with ${r.letter}.`);
    if (
      r.answers.some(
        (a) => a.text.toLocaleLowerCase() === clean.toLocaleLowerCase(),
      )
    )
      throw new Error(
        "That answer has already been used. Mark the player out.",
      );
  }
  r.answers.push({ player: r.current, text: clean || "Spoken answer" });
  r.current = nextPlayer(r, r.current);
  r.remaining = r.duration;
  r.deadline = Date.now() + r.duration * 1000;
}
export function resolveChallenge(s: State, r: Round, invalid: boolean) {
  if (!r.challenge) return;
  const target = invalid ? r.challenge.previous : r.challenge.challenger;
  r.challenge = undefined;
  eliminate(s, r, target);
}
export function guessCard(s: State, r: Round, direction: "higher" | "lower") {
  if (r.status !== "active" || !r.card || !r.deck) return;
  if (!r.deck.length) r.deck = newDeck();
  const next = r.deck.pop()!;
  const success =
    direction === "higher" ? next.rank > r.card.rank : next.rank < r.card.rank;
  const tie = next.rank === r.card.rank;
  r.card = next;
  r.result = tie
    ? "Same rank — no points. Try again."
    : success
      ? "Nice guess! +1 point."
      : "Unlucky! Next player’s turn.";
  if (success) {
    const player = s.players.find((p) => p.id === r.current);
    if (player) player.score++;
  }
  r.current = nextPlayer(r, r.current);
}
export function finishSession(s: State) {
  const session = s.sessions.find((x) => x.id === s.sessionId)!;
  session.endedAt = new Date().toISOString();
  session.scores = s.players.map(({ name, score, avatar }) => ({
    name,
    score,
    avatar,
  }));
  const r = activeRound(s);
  if (r?.status === "active") {
    r.status = "cancelled";
    r.deadline = null;
  }
  s.activeRound = null;
}
export function newSession(s: State, name: string, reset: boolean) {
  if (!s.sessions.find((x) => x.id === s.sessionId)?.endedAt) finishSession(s);
  const session = {
    id: crypto.randomUUID(),
    name: name.trim() || "Game night",
    startedAt: new Date().toISOString(),
  };
  s.sessions.push(session);
  s.sessionId = session.id;
  if (reset) s.players.forEach((p) => (p.score = 0));
}
export function addPlayer(s: State, name: string, avatar: string) {
  const clean = name.trim();
  if (!clean) throw new Error("Enter a player name.");
  if (clean.length > 24)
    throw new Error("Keep player names under 25 characters.");
  if (s.players.length >= 12) throw new Error("Up to 12 players can join.");
  if (
    s.players.some(
      (p) => p.name.toLocaleLowerCase() === clean.toLocaleLowerCase(),
    )
  )
    throw new Error("That name is already in the crew.");
  if (activeRound(s)?.status === "active")
    throw new Error("Finish the round before changing players.");
  s.players.push({ id: crypto.randomUUID(), name: clean, avatar, score: 0 });
}
export function randomGame(): GameId {
  return pick(["quick-stop", "charades", "who-am-i", "higher-lower"]);
}
