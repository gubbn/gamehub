import { useEffect, useRef, useState } from "react";
import {
  Check,
  Clock3,
  Flame,
  Gauge,
  Play,
  RefreshCw,
  Sparkles,
  Star,
  Trophy,
} from "lucide-react";
import {
  makeTimesQuestion,
  pointsForAnswer,
  timesTables,
  type TimesQuestion,
} from "./immy";
import "./immy.css";

type Phase = "setup" | "playing" | "finished";
type Feedback = "correct" | "wrong" | null;
const durations = [30, 60, 120] as const;

export function ImmyZone() {
  const [selected, setSelected] = useState<number[]>([2, 5, 10]);
  const [duration, setDuration] = useState<(typeof durations)[number]>(60);
  const [phase, setPhase] = useState<Phase>("setup");
  const [timeLeft, setTimeLeft] = useState<number>(duration);
  const [question, setQuestion] = useState<TimesQuestion>(() =>
    makeTimesQuestion([2, 5, 10]),
  );
  const [answer, setAnswer] = useState("");
  const [score, setScore] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (phase !== "playing") return;
    const timer = window.setInterval(() => {
      setTimeLeft((current) => {
        if (current <= 1) {
          setPhase("finished");
          return 0;
        }
        return current - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [phase]);

  useEffect(() => {
    if (phase === "playing") inputRef.current?.focus();
  }, [phase, question]);

  function toggleTable(table: number) {
    setSelected((current) =>
      current.includes(table)
        ? current.length === 1
          ? current
          : current.filter((item) => item !== table)
        : [...current, table].sort((a, b) => a - b),
    );
  }

  function startRound() {
    setQuestion(makeTimesQuestion(selected));
    setTimeLeft(duration);
    setAnswer("");
    setScore(0);
    setCorrect(0);
    setAttempts(0);
    setStreak(0);
    setBestStreak(0);
    setFeedback(null);
    setPhase("playing");
  }

  function submitAnswer(event: React.FormEvent) {
    event.preventDefault();
    if (!answer.trim() || phase !== "playing") return;
    const isCorrect = Number(answer) === question.answer;
    setAttempts((value) => value + 1);
    setFeedback(isCorrect ? "correct" : "wrong");
    setAnswer("");

    if (isCorrect) {
      const nextStreak = streak + 1;
      setCorrect((value) => value + 1);
      setStreak(nextStreak);
      setBestStreak((value) => Math.max(value, nextStreak));
      setScore((value) => value + pointsForAnswer(streak));
      setQuestion((current) => makeTimesQuestion(selected, current));
    } else {
      setStreak(0);
    }
  }

  const accuracy = attempts ? Math.round((correct / attempts) * 100) : 0;

  if (phase === "setup") {
    return (
      <div className="immy-zone">
        <section className="immy-setup panel">
          <div className="immy-intro">
            <span className="immy-bolt"><Sparkles size={28} /></span>
            <div>
              <span className="eyebrow">BUILD YOUR PRACTICE MIX</span>
              <h2>Which tables are we rocking?</h2>
              <p>Choose one or more. Every round mixes only the tables you select.</p>
            </div>
          </div>

          <div className="table-picker" aria-label="Times tables">
            {timesTables.map((table) => {
              const active = selected.includes(table);
              return (
                <button
                  key={table}
                  className={active ? "active" : ""}
                  aria-pressed={active}
                  onClick={() => toggleTable(table)}
                >
                  <span>{table}</span>
                  <small>{table} times</small>
                  {active && <Check size={16} />}
                </button>
              );
            })}
          </div>

          <div className="immy-setup-footer">
            <div>
              <span className="eyebrow">ROUND LENGTH</span>
              <div className="immy-duration" aria-label="Round length">
                {durations.map((seconds) => (
                  <button
                    key={seconds}
                    className={duration === seconds ? "active" : ""}
                    aria-pressed={duration === seconds}
                    onClick={() => setDuration(seconds)}
                  >
                    {seconds < 60 ? `${seconds}s` : `${seconds / 60} min`}
                  </button>
                ))}
              </div>
            </div>
            <button className="primary immy-start" onClick={startRound}>
              Start round <Play size={18} fill="currentColor" />
            </button>
          </div>
        </section>
      </div>
    );
  }

  if (phase === "finished") {
    return (
      <div className="immy-zone">
        <section className="immy-finish panel">
          <span className="immy-trophy"><Trophy size={42} /></span>
          <span className="eyebrow">TIME'S UP</span>
          <h2>{correct ? "Brilliant work!" : "Warm-up complete!"}</h2>
          <p>You practised the {selected.join(", ")} times tables.</p>
          <div className="immy-results">
            <div><strong>{score}</strong><span>points</span></div>
            <div><strong>{correct}</strong><span>correct</span></div>
            <div><strong>{accuracy}%</strong><span>accuracy</span></div>
            <div><strong>{bestStreak}</strong><span>best streak</span></div>
          </div>
          <div className="immy-finish-actions">
            <button className="secondary" onClick={() => setPhase("setup")}>
              Change tables
            </button>
            <button className="primary" onClick={startRound}>
              Play again <RefreshCw size={17} />
            </button>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="immy-zone">
      <section className="immy-hud panel" aria-label="Round progress">
        <div><Clock3 size={18} /><span>TIME</span><strong>{timeLeft}s</strong></div>
        <div><Star size={18} /><span>SCORE</span><strong>{score}</strong></div>
        <div><Flame size={18} /><span>STREAK</span><strong>{streak}</strong></div>
      </section>
      <section className={`immy-stage panel ${feedback ?? ""}`}>
        <div className="immy-table-chip">{question.table} times table</div>
        <div className="immy-sum" aria-live="polite">
          <strong>{question.table}</strong>
          <span>×</span>
          <strong>{question.multiplier}</strong>
          <span>=</span>
          <b>?</b>
        </div>
        <form onSubmit={submitAnswer}>
          <label htmlFor="immy-answer">Your answer</label>
          <div>
            <input
              ref={inputRef}
              id="immy-answer"
              type="number"
              inputMode="numeric"
              min="0"
              max="144"
              autoComplete="off"
              value={answer}
              onChange={(event) => {
                setAnswer(event.target.value);
                setFeedback(null);
              }}
            />
            <button className="primary" type="submit">Check <Check size={18} /></button>
          </div>
        </form>
        <p className="immy-feedback" aria-live="polite">
          {feedback === "correct"
            ? "Yes! Keep the streak going."
            : feedback === "wrong"
              ? "Not quite. Try that sum again."
              : "Type the answer and press Enter."}
        </p>
      </section>
      <div className="immy-round-note">
        <Gauge size={17} /> {correct} correct from {attempts} attempts
      </div>
    </div>
  );
}
