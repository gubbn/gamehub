import { useEffect, useMemo, useState } from "react";
import {
  Baby,
  Check,
  Hand,
  HandFist,
  Delete,
  EyeOff,
  Lightbulb,
  LockKeyhole,
  PartyPopper,
  RefreshCw,
  RotateCcw,
  Scissors,
  Swords,
  Users,
} from "lucide-react";
import {
  alphabet,
  hangmanPacks,
  maxHangmanMisses,
  missedLetters,
  nextIndex,
  normaliseHangmanWord,
  pickRpsChoice,
  resolveRps,
  rpsChoices,
  solvedWord,
  wordLetters,
  wouldYouRatherQuestions,
  type HangmanEntry,
  type HangmanPack,
  type RpsChoice,
  type RpsResult,
  type WouldYouRatherAudience,
} from "./party-games";
import "./party-games.css";

export const partyGameCards = [
  {
    id: "would-you-rather" as const,
    name: "Would You Rather?",
    tag: "PICK A SIDE",
    description: "Two impossible choices. One very revealing answer.",
    icon: "🤔",
    color: "coral",
    players: "2+ players",
    time: "At your pace",
  },
  {
    id: "hangman" as const,
    name: "Hangman",
    tag: "GUESS THE WORD",
    description: "Choose your letters carefully before the picture is complete.",
    icon: "🔤",
    color: "blue",
    players: "1+ players",
    time: "6 wrong guesses",
  },
  {
    id: "trivia" as const,
    name: "Trivia Quiz",
    tag: "TEST YOUR KNOWLEDGE",
    description: "Pick a question pack and chase the perfect score together.",
    icon: "🧠",
    color: "teal",
    players: "1+ players",
    time: "5 or 10 questions",
  },
  {
    id: "rock-paper-scissors" as const,
    name: "Rock Paper Scissors",
    tag: "BEAT THE COMPUTER",
    description: "Pick your move and race the computer to five wins.",
    icon: "✊",
    color: "yellow",
    players: "1 player",
    time: "First to 5",
  },
  {
    id: "noughts-crosses" as const,
    name: "Noughts & Crosses",
    tag: "THREE IN A ROW",
    description: "Play a friend or take on the computer in a quick match.",
    icon: "⭕",
    color: "mint",
    players: "1–2 players",
    time: "Quick rounds",
  },
];

export function WouldYouRather() {
  const [audience, setAudience] = useState<WouldYouRatherAudience>("kids");
  const [questionIndex, setQuestionIndex] = useState(() =>
    nextIndex(wouldYouRatherQuestions.kids.length),
  );
  const [votes, setVotes] = useState<[number, number]>([0, 0]);
  const [round, setRound] = useState(1);
  const question = wouldYouRatherQuestions[audience][questionIndex];
  const totalVotes = votes[0] + votes[1];

  function changeAudience(next: WouldYouRatherAudience) {
    setAudience(next);
    setQuestionIndex(nextIndex(wouldYouRatherQuestions[next].length));
    setVotes([0, 0]);
    setRound(1);
  }

  function nextQuestion() {
    setQuestionIndex((current) =>
      nextIndex(wouldYouRatherQuestions[audience].length, current),
    );
    setVotes([0, 0]);
    setRound((value) => value + 1);
  }

  return (
    <div className="wyr-zone">
      <section className="wyr-toolbar panel">
        <div>
          <span className="eyebrow">QUESTION SET</span>
          <div className="segmented" aria-label="Question set">
            <button
              className={audience === "kids" ? "active" : ""}
              aria-pressed={audience === "kids"}
              onClick={() => changeAudience("kids")}
            >
              <Baby size={17} /> Kids
            </button>
            <button
              className={audience === "adults" ? "active" : ""}
              aria-pressed={audience === "adults"}
              onClick={() => changeAudience("adults")}
            >
              <Users size={17} /> Adults
            </button>
          </div>
        </div>
        <div className="wyr-round">
          <span>QUESTION</span>
          <strong>{String(round).padStart(2, "0")}</strong>
        </div>
      </section>

      {audience === "adults" && (
        <div className="adult-game-note">
          <PartyPopper size={18} />
          Grown-up dilemmas with mildly cheeky themes.
        </div>
      )}

      <section className="wyr-stage" aria-live="polite">
        <button
          className="wyr-choice wyr-left"
          onClick={() => setVotes(([left, right]) => [left + 1, right])}
        >
          <span className="choice-letter">A</span>
          <small>WOULD YOU RATHER…</small>
          <strong>{question.left}</strong>
          <span className="vote-action">Vote A</span>
          {totalVotes > 0 && (
            <span className="vote-result">
              {votes[0]} {votes[0] === 1 ? "vote" : "votes"}
            </span>
          )}
        </button>
        <div className="wyr-or" aria-hidden="true">
          OR
        </div>
        <button
          className="wyr-choice wyr-right"
          onClick={() => setVotes(([left, right]) => [left, right + 1])}
        >
          <span className="choice-letter">B</span>
          <small>WOULD YOU RATHER…</small>
          <strong>{question.right}</strong>
          <span className="vote-action">Vote B</span>
          {totalVotes > 0 && (
            <span className="vote-result">
              {votes[1]} {votes[1] === 1 ? "vote" : "votes"}
            </span>
          )}
        </button>
      </section>

      <div className="wyr-controls">
        <span>
          <Users size={16} />
          {totalVotes
            ? `${totalVotes} ${totalVotes === 1 ? "person has" : "people have"} chosen`
            : "Pass the phone around and tap a side"}
        </span>
        <div>
          <button
            className="secondary"
            disabled={!totalVotes}
            onClick={() => setVotes([0, 0])}
          >
            <RotateCcw size={17} /> Clear votes
          </button>
          <button className="primary" onClick={nextQuestion}>
            Next question <RefreshCw size={17} />
          </button>
        </div>
      </div>
    </div>
  );
}

type HangmanMode = HangmanPack | "custom";

function Figure({ misses }: { misses: number }) {
  return (
    <div
      className={`hangman-figure misses-${misses}`}
      aria-label={`${misses} of ${maxHangmanMisses} wrong guesses`}
    >
      <i className="gallows-base" />
      <i className="gallows-pole" />
      <i className="gallows-beam" />
      <i className="gallows-rope" />
      <span className="figure-head" />
      <span className="figure-body" />
      <span className="figure-arm left" />
      <span className="figure-arm right" />
      <span className="figure-leg left" />
      <span className="figure-leg right" />
    </div>
  );
}

function WordDisplay({
  word,
  guessed,
  reveal,
}: {
  word: string;
  guessed: Set<string>;
  reveal: boolean;
}) {
  return (
    <div className="hangman-word" aria-label={reveal ? word : "Mystery word"}>
      {word.split(" ").map((part, partIndex) => (
        <span className="hangman-word-part" key={`${part}-${partIndex}`}>
          {[...part].map((character, index) => {
            const isLetter = /[A-Z]/.test(character);
            return (
              <span
                className={isLetter ? "letter-slot" : "word-punctuation"}
                key={`${character}-${index}`}
              >
                {!isLetter || reveal || guessed.has(character)
                  ? character
                  : ""}
              </span>
            );
          })}
        </span>
      ))}
    </div>
  );
}

export function Hangman() {
  const [mode, setMode] = useState<HangmanMode>("animals");
  const [packIndexes, setPackIndexes] = useState<Record<HangmanPack, number>>({
    animals: nextIndex(hangmanPacks.animals.length),
    food: nextIndex(hangmanPacks.food.length),
    places: nextIndex(hangmanPacks.places.length),
  });
  const [entry, setEntry] = useState<HangmanEntry>(() =>
    hangmanPacks.animals[packIndexes.animals],
  );
  const [guessed, setGuessed] = useState<Set<string>>(() => new Set());
  const [customWord, setCustomWord] = useState("");
  const [customHint, setCustomHint] = useState("");
  const [hintRevealed, setHintRevealed] = useState(false);
  const [handoff, setHandoff] = useState(false);
  const [error, setError] = useState("");
  const misses = missedLetters(entry.word, guessed).length;
  const won = solvedWord(entry.word, guessed);
  const lost = misses >= maxHangmanMisses;
  const finished = won || lost;

  function startPack(nextMode: HangmanPack) {
    const next = nextIndex(hangmanPacks[nextMode].length, packIndexes[nextMode]);
    setMode(nextMode);
    setPackIndexes((indexes) => ({ ...indexes, [nextMode]: next }));
    setEntry(hangmanPacks[nextMode][next]);
    setGuessed(new Set());
    setHintRevealed(false);
    setHandoff(false);
    setError("");
  }

  function guess(letter: string) {
    if (finished || guessed.has(letter) || handoff || mode === "custom" && !entry.word)
      return;
    setGuessed((current) => new Set(current).add(letter));
  }

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      const letter = event.key.toLocaleUpperCase();
      if (/^[A-Z]$/.test(letter)) guess(letter);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  function prepareCustom(event: React.FormEvent) {
    event.preventDefault();
    const word = normaliseHangmanWord(customWord);
    if (wordLetters(word).size < 2) {
      setError("Use a word or phrase with at least two different letters.");
      return;
    }
    if (word.length > 28) {
      setError("Keep the answer to 28 characters or fewer.");
      return;
    }
    setEntry({ word, hint: customHint.trim() || "A secret chosen by another player" });
    setGuessed(new Set());
    setHintRevealed(false);
    setError("");
    setHandoff(true);
  }

  function chooseMode(nextMode: HangmanMode) {
    if (nextMode === "custom") {
      setMode("custom");
      setCustomWord("");
      setCustomHint("");
      setEntry({ word: "", hint: "" });
      setGuessed(new Set());
      setHintRevealed(false);
      setHandoff(false);
      setError("");
      return;
    }
    startPack(nextMode);
  }

  const remaining = maxHangmanMisses - misses;
  const status = won
    ? "You found it!"
    : lost
      ? `The answer was ${entry.word}`
      : `${remaining} wrong ${remaining === 1 ? "guess" : "guesses"} left`;
  const maskedAnswer = useMemo(
    () => entry.word.replace(/[A-Z]/g, "•"),
    [entry.word],
  );

  return (
    <div className="hangman-zone">
      <section className="hangman-toolbar panel">
        <div>
          <span className="eyebrow">WORD PACK</span>
          <div className="hangman-packs" aria-label="Word pack">
            {(["animals", "food", "places", "custom"] as HangmanMode[]).map(
              (pack) => (
                <button
                  key={pack}
                  className={mode === pack ? "active" : ""}
                  aria-pressed={mode === pack}
                  onClick={() => chooseMode(pack)}
                >
                  {pack === "animals"
                    ? "Animals"
                    : pack === "food"
                      ? "Food"
                      : pack === "places"
                        ? "Places"
                        : "Custom word"}
                </button>
              ),
            )}
          </div>
        </div>
        <div className="hangman-lives" aria-live="polite">
          <span>CHANCES</span>
          <div>
            {Array.from({ length: maxHangmanMisses }, (_, index) => (
              <i className={index < remaining ? "left" : "used"} key={index} />
            ))}
          </div>
        </div>
      </section>

      {mode === "custom" && !entry.word && (
        <section className="custom-word-panel panel">
          <div className="custom-word-icon">
            <LockKeyhole size={30} />
          </div>
          <div>
            <span className="eyebrow">PASS-THE-DEVICE SETUP</span>
            <h2>Choose a secret word</h2>
            <p>
              One player enters the answer, then hands the device to the guesser.
            </p>
          </div>
          <form onSubmit={prepareCustom}>
            <label>
              Secret word or phrase
              <input
                autoFocus
                type="password"
                autoComplete="off"
                value={customWord}
                maxLength={28}
                onChange={(event) => setCustomWord(event.target.value)}
                placeholder="Keep it hidden"
              />
            </label>
            <label>
              Hint <span className="optional">optional</span>
              <input
                value={customHint}
                maxLength={80}
                onChange={(event) => setCustomHint(event.target.value)}
                placeholder="A helpful clue"
              />
            </label>
            {error && <p className="form-error">{error}</p>}
            <button className="primary" type="submit">
              Hide answer <EyeOff size={17} />
            </button>
          </form>
        </section>
      )}

      {mode === "custom" && handoff && (
        <section className="hangman-handoff panel">
          <span className="handoff-lock">
            <LockKeyhole size={32} />
          </span>
          <span className="eyebrow">ANSWER HIDDEN</span>
          <h2>Pass the device to the guesser</h2>
          <p>{maskedAnswer}</p>
          <button className="primary" onClick={() => setHandoff(false)}>
            I’m ready to guess <Check size={18} />
          </button>
        </section>
      )}

      {entry.word && !handoff && (
        <>
          <section className={`hangman-board panel ${finished ? "finished" : ""}`}>
            <div className="hangman-drawing">
              <Figure misses={misses} />
              <p className={won ? "won" : lost ? "lost" : ""}>{status}</p>
            </div>
            <div className="hangman-puzzle">
              <div className="hangman-hint">
                <Lightbulb size={18} />
                {hintRevealed ? (
                  <span aria-live="polite">{entry.hint}</span>
                ) : (
                  <button
                    type="button"
                    aria-label="Reveal clue"
                    onClick={() => setHintRevealed(true)}
                  >
                    Reveal clue
                  </button>
                )}
              </div>
              <WordDisplay word={entry.word} guessed={guessed} reveal={finished} />
              <div className="hangman-keyboard" aria-label="Letter keyboard">
                {alphabet.map((letter) => {
                  const used = guessed.has(letter);
                  const correct = used && entry.word.includes(letter);
                  return (
                    <button
                      key={letter}
                      disabled={used || finished}
                      className={used ? (correct ? "correct" : "wrong") : ""}
                      aria-label={`${letter}${used ? correct ? ", correct" : ", incorrect" : ""}`}
                      onClick={() => guess(letter)}
                    >
                      {letter}
                    </button>
                  );
                })}
              </div>
            </div>
          </section>
          <div className="hangman-controls">
            <span>
              <Delete size={17} />
              {guessed.size
                ? `${guessed.size} ${guessed.size === 1 ? "letter" : "letters"} tried`
                : "Tap a letter or use your keyboard"}
            </span>
            <button
              className="primary"
              onClick={() =>
                mode === "custom" ? chooseMode("custom") : startPack(mode)
              }
            >
              {finished ? "Play again" : "New word"} <RefreshCw size={17} />
            </button>
          </div>
        </>
      )}
    </div>
  );
}

const rpsLabels: Record<RpsChoice, string> = {
  rock: "Rock",
  paper: "Paper",
  scissors: "Scissors",
};

function RpsIcon({ choice, size = 32 }: { choice: RpsChoice; size?: number }) {
  if (choice === "rock") return <HandFist size={size} />;
  if (choice === "paper") return <Hand size={size} />;
  return <Scissors size={size} />;
}

type RpsRound = {
  player: RpsChoice;
  computer: RpsChoice;
  result: RpsResult;
};

export function RockPaperScissors() {
  const [playerScore, setPlayerScore] = useState(0);
  const [computerScore, setComputerScore] = useState(0);
  const [rounds, setRounds] = useState<RpsRound[]>([]);
  const latest = rounds.at(-1);
  const finished = playerScore >= 5 || computerScore >= 5;

  function play(player: RpsChoice) {
    if (finished) return;
    const computer = pickRpsChoice();
    const result = resolveRps(player, computer);
    setRounds((current) => [...current, { player, computer, result }]);
    if (result === "win") setPlayerScore((value) => value + 1);
    if (result === "lose") setComputerScore((value) => value + 1);
  }

  function reset() {
    setPlayerScore(0);
    setComputerScore(0);
    setRounds([]);
  }

  const announcement = finished
    ? playerScore > computerScore
      ? "You won the match!"
      : "Computer wins this one."
    : !latest
      ? "Choose your move"
      : latest.result === "draw"
        ? "Draw! Same move."
        : latest.result === "win"
          ? `${rpsLabels[latest.player]} beats ${rpsLabels[latest.computer]}. You win!`
          : `${rpsLabels[latest.computer]} beats ${rpsLabels[latest.player]}. Computer wins.`;

  return (
    <div className="rps-zone">
      <section className="rps-scoreboard panel" aria-label="Match score">
        <div><span>YOU</span><strong>{playerScore}</strong></div>
        <div className="rps-target"><Swords size={19} /><span>FIRST TO 5</span></div>
        <div><span>COMPUTER</span><strong>{computerScore}</strong></div>
      </section>

      <section className={`rps-arena panel ${latest?.result ?? "waiting"}`}>
        <div className="rps-faceoff" aria-live="polite">
          <div>
            <span>YOUR MOVE</span>
            <i>{latest ? <RpsIcon choice={latest.player} size={58} /> : "?"}</i>
          </div>
          <b>VS</b>
          <div>
            <span>COMPUTER</span>
            <i>{latest ? <RpsIcon choice={latest.computer} size={58} /> : "?"}</i>
          </div>
        </div>
        <h2>{announcement}</h2>
        {!finished ? (
          <div className="rps-choices" aria-label="Choose your move">
            {rpsChoices.map((choice) => (
              <button key={choice} onClick={() => play(choice)}>
                <RpsIcon choice={choice} size={34} />
                <span>{rpsLabels[choice]}</span>
              </button>
            ))}
          </div>
        ) : (
          <button className="primary" onClick={reset}>
            New match <RefreshCw size={17} />
          </button>
        )}
      </section>

      <section className="rps-history panel">
        <div className="section-title">
          <div><h3>Round history</h3><p>Draws do not add a point.</p></div>
          {!!rounds.length && (
            <button className="text-button" onClick={reset}>
              <RotateCcw size={15} /> Reset
            </button>
          )}
        </div>
        {rounds.length ? (
          <div className="rps-rounds">
            {rounds.slice(-8).reverse().map((round, index) => (
              <div key={`${rounds.length - index}-${round.player}-${round.computer}`}>
                <span>Round {rounds.length - index}</span>
                <span><RpsIcon choice={round.player} size={18} /> {rpsLabels[round.player]}</span>
                <b className={round.result}>
                  {round.result === "win" ? "Won" : round.result === "lose" ? "Lost" : "Draw"}
                </b>
                <span><RpsIcon choice={round.computer} size={18} /> {rpsLabels[round.computer]}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="rps-empty">Your last eight rounds will appear here.</p>
        )}
      </section>
    </div>
  );
}
