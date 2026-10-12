import { useState } from "react";
import { ArrowRight, Check, Lightbulb, Medal, RefreshCw, Sparkles, Trophy, X } from "lucide-react";
import { buildTriviaRound, type TriviaQuestion, type TriviaSelection } from "./social-games";
import "./social-games.css";

const categoryLabels: Record<TriviaSelection, string> = {
  mixed: "Mixed bag",
  kids: "Kids",
  general: "General knowledge",
  entertainment: "Entertainment",
  science: "Science",
};

type TriviaPhase = "setup" | "question" | "results";

export function TriviaQuiz() {
  const [phase, setPhase] = useState<TriviaPhase>("setup");
  const [category, setCategory] = useState<TriviaSelection>("mixed");
  const [length, setLength] = useState<5 | 10>(10);
  const [questions, setQuestions] = useState<TriviaQuestion[]>([]);
  const [position, setPosition] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const question = questions[position];

  function start() {
    setQuestions(buildTriviaRound(category, length));
    setPosition(0);
    setSelected(null);
    setScore(0);
    setPhase("question");
  }

  function answer(index: number) {
    if (selected !== null || !question) return;
    setSelected(index);
    if (index === question.answer) setScore((value) => value + 1);
  }

  function next() {
    if (position + 1 >= questions.length) {
      setPhase("results");
      return;
    }
    setPosition((value) => value + 1);
    setSelected(null);
  }

  const percentage = questions.length
    ? Math.round((score / questions.length) * 100)
    : 0;
  const resultMessage =
    percentage === 100
      ? "A perfect round!"
      : percentage >= 70
        ? "Sharp minds at work."
        : percentage >= 40
          ? "A solid team effort."
          : "The rematch starts now.";

  return (
    <div className="trivia-zone">
      {phase === "setup" && (
        <section className="trivia-setup panel">
          <div className="trivia-setup-copy">
            <span className="trivia-icon">🧠</span>
            <span className="eyebrow">BUILD YOUR ROUND</span>
            <h2>What do you know?</h2>
            <p>Choose a pack, gather the team and see how many you can get right.</p>
          </div>
          <div className="trivia-settings">
            <div>
              <span className="setting-label">Question pack</span>
              <div className="trivia-categories">
                {(Object.keys(categoryLabels) as TriviaSelection[]).map((item) => (
                  <button
                    className={category === item ? "active" : ""}
                    aria-pressed={category === item}
                    key={item}
                    onClick={() => setCategory(item)}
                  >
                    {categoryLabels[item]}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <span className="setting-label">Round length</span>
              <div className="segmented quiz-length" aria-label="Round length">
                <button className={length === 5 ? "active" : ""} aria-pressed={length === 5} onClick={() => setLength(5)}>
                  5 questions
                </button>
                <button className={length === 10 ? "active" : ""} aria-pressed={length === 10} onClick={() => setLength(10)}>
                  10 questions
                </button>
              </div>
            </div>
            <button className="primary wide" onClick={start}>
              Start quiz <Sparkles size={17} />
            </button>
          </div>
        </section>
      )}

      {phase === "question" && question && (
        <>
          <section className="trivia-progress panel">
            <div>
              <span>{categoryLabels[category]}</span>
              <strong>Question {position + 1} of {questions.length}</strong>
            </div>
            <div className="progress-track">
              <i style={{ width: `${((position + 1) / questions.length) * 100}%` }} />
            </div>
            <span className="live-score"><Trophy size={16} /> {score} pts</span>
          </section>
          <section className="trivia-card panel" aria-live="polite">
            <span className="question-number">{String(position + 1).padStart(2, "0")}</span>
            <span className="eyebrow">{categoryLabels[question.category]}</span>
            <h2>{question.question}</h2>
            <div className="answer-grid">
              {question.options.map((option, index) => {
                const answered = selected !== null;
                const correct = answered && index === question.answer;
                const wrong = answered && selected === index && !correct;
                return (
                  <button
                    className={correct ? "correct" : wrong ? "wrong" : ""}
                    disabled={answered}
                    key={option}
                    onClick={() => answer(index)}
                  >
                    <span>{String.fromCharCode(65 + index)}</span>
                    <strong>{option}</strong>
                    {correct && <Check size={20} />}
                    {wrong && <X size={20} />}
                  </button>
                );
              })}
            </div>
            {selected !== null && (
              <div className={`answer-feedback ${selected === question.answer ? "correct" : "wrong"}`}>
                <span>{selected === question.answer ? <Check size={20} /> : <Lightbulb size={20} />}</span>
                <div>
                  <strong>{selected === question.answer ? "Correct!" : `It was ${question.options[question.answer]}.`}</strong>
                  <p>{question.detail}</p>
                </div>
              </div>
            )}
          </section>
          <div className="trivia-controls">
            <span>{selected === null ? "Choose one answer" : `${score} of ${position + 1} correct so far`}</span>
            <button className="primary" disabled={selected === null} onClick={next}>
              {position + 1 === questions.length ? "See results" : "Next question"} <ArrowRight size={17} />
            </button>
          </div>
        </>
      )}

      {phase === "results" && (
        <section className="trivia-results panel">
          <span className="results-medal"><Medal size={42} /></span>
          <span className="eyebrow">ROUND COMPLETE</span>
          <h2>{resultMessage}</h2>
          <div className="result-score">
            <strong>{score}</strong>
            <span>out of {questions.length}</span>
          </div>
          <p>{percentage}% correct · {categoryLabels[category]}</p>
          <div className="result-actions">
            <button className="secondary" onClick={() => setPhase("setup")}>Change quiz</button>
            <button className="primary" onClick={start}>Play again <RefreshCw size={17} /></button>
          </div>
        </section>
      )}
    </div>
  );
}
