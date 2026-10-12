import { useEffect, useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  CircleHelp,
  Copy,
  Download,
  Eye,
  Heart,
  ImagePlus,
  Palette,
  Plus,
  Search,
  Sparkles,
  Upload,
  Volume2,
} from "lucide-react";
import {
  allPictures,
  bundledPictures,
  colourQuestion,
  eliPacks,
  eliChoiceCounts,
  matchingCards,
  practicePictures,
  setEliPack,
  eliPalettes,
  starterPictures,
  pictureCategories,
  playablePictures,
  recognitionQuestion,
  recognitionWord,
  validateEliBackup,
  yesNoQuestion,
  type EliChoiceCount,
  type MatchingCard,
  type Picture,
  type PictureCategory,
} from "./eli-data";
import { eliDb, initializeEli, preparePicture, updateEli } from "./eli-db";
import { pick } from "./random";
import { EliPicture as PictureArt } from "./EliPicture";
import "./eli.css";

export function EliZone() {
  const library = useLiveQuery(() => eliDb.library.get("main"));
  const [view, setView] = useState<
    | "welcome"
    | "library"
    | "packs"
    | "find"
    | "name"
    | "match"
    | "yes-no"
    | "colour"
  >("welcome");
  const [category, setCategory] = useState("All pictures");
  const [pack, setPack] = useState("all");
  const [search, setSearch] = useState("");
  const [question, setQuestion] = useState<ReturnType<
    typeof recognitionQuestion
  > | null>(null);
  const [naming, setNaming] = useState<Picture | null>(null);
  const [matchCards, setMatchCards] = useState<MatchingCard[]>([]);
  const [flipped, setFlipped] = useState<string[]>([]);
  const [matched, setMatched] = useState<Set<string>>(() => new Set());
  const [yesNo, setYesNo] = useState<ReturnType<typeof yesNoQuestion> | null>(
    null,
  );
  const [yesNoAnswer, setYesNoAnswer] = useState<boolean | null>(null);
  const [colour, setColour] = useState<ReturnType<typeof colourQuestion> | null>(
    null,
  );
  const [colourSelected, setColourSelected] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [selected, setSelected] = useState("");
  const [round, setRound] = useState(1);
  const [complete, setComplete] = useState(false);
  const [notice, setNotice] = useState("");
  const [fatal, setFatal] = useState("");
  const [busy, setBusy] = useState(false);
  const [label, setLabel] = useState("");
  const [photoCategory, setPhotoCategory] =
    useState<PictureCategory>("My pictures");
  const [photo, setPhoto] = useState<string | null>(null);
  const [voice, setVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [importing, setImporting] = useState<ReturnType<
    typeof validateEliBackup
  > | null>(null);
  const importRef = useRef<HTMLInputElement>(null);
  const photoRef = useRef<HTMLInputElement>(null);
  const feedbackRef = useRef<HTMLButtonElement>(null);
  const gameHeadingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    initializeEli().catch(() =>
      setFatal(
        "The picture library couldn’t open. Check that browser storage is allowed, then reload.",
      ),
    );
  }, []);
  useEffect(() => {
    if (!("speechSynthesis" in window)) return;
    const speech = window.speechSynthesis;
    const refresh = () => {
      const voices = speech.getVoices().filter((v) => v.localService);
      setVoice(
        voices.find((v) => v.lang.toLowerCase().startsWith("en-gb")) ??
          voices.find((v) => v.lang.toLowerCase().startsWith("en")) ??
          null,
      );
    };
    refresh();
    speech.addEventListener("voiceschanged", refresh);
    return () => {
      speech.removeEventListener("voiceschanged", refresh);
      speech.cancel();
    };
  }, []);
  useEffect(() => {
    if (selected && selected === question?.target.id)
      feedbackRef.current?.focus({ preventScroll: true });
  }, [selected, question]);
  useEffect(() => {
    if (flipped.length !== 2) return;
    const [first, second] = flipped.map((key) =>
      matchCards.find((card) => card.key === key),
    );
    const timer = window.setTimeout(() => {
      if (first && second && first.picture.id === second.picture.id) {
        setMatched((current) => new Set(current).add(first.picture.id));
      }
      setFlipped([]);
    }, first?.picture.id === second?.picture.id ? 450 : 750);
    return () => window.clearTimeout(timer);
  }, [flipped, matchCards]);
  const say = (word: string) => {
    if (!voice) {
      setNotice(
        "A device voice isn’t available. Read the word aloud together instead.",
      );
      return;
    }
    const speech = new SpeechSynthesisUtterance(word);
    speech.voice = voice;
    speech.lang = voice.lang;
    speech.rate = 0.8;
    speech.onerror = (event) => {
      if (!["canceled", "interrupted"].includes(event.error)) {
        setNotice(
          "The voice couldn’t play. You can read the word aloud instead.",
        );
      }
    };
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(speech);
  };
  const save = async (action: () => Promise<unknown>, message?: string) => {
    try {
      await action();
      if (message) setNotice(message);
      return true;
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "That change couldn’t be saved. Try again.",
      );
      return false;
    }
  };
  if (fatal)
    return (
      <div className="panel eli-empty" role="alert">
        <h2>Let’s try again.</h2>
        <p>{fatal}</p>
      </div>
    );
  if (!library) return <p role="status">Opening Eli’s picture library…</p>;
  const pictures = allPictures(library);
  const pool = playablePictures(library, category, pack);
  const visiblePictures = practicePictures(library, category, pack).filter(
    (p) =>
      (category === "All pictures" || p.category === category) &&
      p.label.toLowerCase().includes(search.trim().toLowerCase()),
  );
  const correct = !!question && selected === question.target.id;
  const yesNoCorrect = yesNoAnswer !== null && yesNoAnswer === yesNo?.answer;
  const colourCorrect = !!colour && colourSelected === colour.target.id;
  const matchComplete =
    matchCards.length > 0 && matched.size === matchCards.length / 2;
  const packPicker = (
    <label>
      Practice pack
      <select
        value={pack}
        onChange={(e) => {
          setPack(e.target.value);
          setCategory("All pictures");
        }}
      >
        <option value="all">All enabled pictures</option>
        <option value="starter">Starter library · 30 pictures</option>
        {eliPacks
          .filter((p) => library.enabledPacks?.includes(p.id))
          .map((p) => (
            <option key={p.id} value={p.id}>
              {p.label} · {p.ids.length} pictures
            </option>
          ))}
      </select>
    </label>
  );
  const start = (mode: "find" | "name" | "match" | "yes-no" | "colour") => {
    setNotice("");
    if (["find", "match", "yes-no"].includes(mode) && pool.length < 2) {
      setNotice(
        `Include at least two pictures in this category to play ${mode === "match" ? "Match Pair" : mode === "yes-no" ? "Yes or No" : "Find it"}.`,
      );
      return;
    }
    if (mode !== "colour" && !pool.length) {
      setNotice("Include a picture in this category to play.");
      return;
    }
    if (mode === "find") {
      setQuestion(recognitionQuestion(pool, library.choices));
    } else if (mode === "name") {
      setNaming(pick(pool));
    } else if (mode === "match") {
      setMatchCards(matchingCards(pool, 3));
      setFlipped([]);
      setMatched(new Set());
    } else if (mode === "yes-no") {
      setYesNo(yesNoQuestion(pool));
      setYesNoAnswer(null);
    } else {
      setColour(colourQuestion());
      setColourSelected("");
    }
    setSelected("");
    setRevealed(false);
    setRound(1);
    setComplete(false);
    setView(mode);
  };
  const next = () => {
    if (round === 5) {
      setComplete(true);
      return;
    }
    setQuestion(
      recognitionQuestion(pool, library.choices, question?.target.id),
    );
    setSelected("");
    setRound(round + 1);
    gameHeadingRef.current?.focus({ preventScroll: true });
  };
  const nextName = () => {
    const others = pool.filter((p) => p.id !== naming?.id);
    setNaming(pick(others.length ? others : pool));
    setRevealed(false);
  };
  const nextYesNo = () => {
    if (round === 5) {
      setComplete(true);
      return;
    }
    setYesNo(yesNoQuestion(pool, yesNo?.target.id));
    setYesNoAnswer(null);
    setRound(round + 1);
    gameHeadingRef.current?.focus({ preventScroll: true });
  };
  const nextColour = () => {
    if (round === 5) {
      setComplete(true);
      return;
    }
    setColour(colourQuestion(colour?.target.id));
    setColourSelected("");
    setRound(round + 1);
    gameHeadingRef.current?.focus({ preventScroll: true });
  };
  const exportLibrary = () => {
    const url = URL.createObjectURL(
      new Blob(
        [
          JSON.stringify(
            { format: "gamehub-eli", version: 1, library },
            null,
            2,
          ),
        ],
        { type: "application/json" },
      ),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `eli-zone-pictures-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setNotice(
      "Picture backup downloaded. Keep it safe: it includes your personal pictures.",
    );
  };
  return (
    <section
      className="eli-zone"
      data-palette={library.palette ?? "sage"}
      aria-label="Eli Zone"
    >
      {(view === "welcome" || view === "library" || view === "packs") && (
        <nav className="eli-view-tabs" aria-label="Eli Zone sections">
          <button
            aria-current={view === "welcome" ? "page" : undefined}
            onClick={() => {
              setView("welcome");
              setNotice("");
            }}
          >
            <Sparkles size={18} /> Let’s play
          </button>
          <button
            aria-current={view === "library" ? "page" : undefined}
            onClick={() => {
              setView("library");
              setNotice("");
            }}
          >
            <BookOpen size={18} /> Picture library{" "}
            <span>{pictures.length}</span>
          </button>
          <button
            aria-current={view === "packs" ? "page" : undefined}
            onClick={() => {
              setView("packs");
              setNotice("");
            }}
          >
            <Plus size={18} /> Expansion packs
          </button>
        </nav>
      )}
      {(view === "welcome" || view === "library" || view === "packs") && (
        <fieldset className="eli-palette-picker">
          <legend>Card colours</legend>
          {eliPalettes.map((palette) => (
            <button
              key={palette.id}
              type="button"
              aria-pressed={(library.palette ?? "sage") === palette.id}
              onClick={() =>
                save(() =>
                  updateEli((l) => {
                    l.palette = palette.id;
                  }),
                )
              }
            >
              <span
                className="eli-palette-swatch"
                style={{ background: palette.color }}
                aria-hidden="true"
              />
              {palette.label}
              {(library.palette ?? "sage") === palette.id && (
                <Check size={14} aria-hidden="true" />
              )}
            </button>
          ))}
        </fieldset>
      )}
      {notice && (
        <div className="eli-notice" role="status">
          {notice}
        </div>
      )}
      {view === "packs" && (
        <section className="eli-expansions" aria-label="Eli expansion packs">
          <div className="panel eli-pack-intro">
            <span className="eyebrow">GROW AT HIS PACE</span>
            <h2>A little more to discover</h2>
            <p>
              Choose a pack when he is ready. Add it to play, practise it on its
              own, or leave it out again. The starter library stays available,
              and overlapping pictures appear only once.
            </p>
            <p className="muted">
              All six packs are bundled for offline use. Personal pictures and
              individual exclusions are kept. Colour swatches use their true
              colours, regardless of your card palette.
            </p>
          </div>
          <div className="eli-pack-grid">
            {eliPacks.map((p) => {
              const enabled = library.enabledPacks?.includes(p.id) ?? false;
              return (
                <article
                  className={`panel eli-pack-card ${enabled ? "enabled" : ""}`}
                  key={p.id}
                >
                  <div className="eli-pack-preview" aria-hidden="true">
                    {p.previews.map((id) => (
                      <PictureArt
                        key={id}
                        picture={bundledPictures.find((x) => x.id === id)!}
                        hiddenLabel
                      />
                    ))}
                  </div>
                  <div className="eli-pack-heading">
                    <h3>{p.label}</h3>
                    <span>{p.ids.length} cards</span>
                  </div>
                  <p>{p.description}</p>
                  <button
                    className={enabled ? "secondary" : "primary"}
                    aria-pressed={enabled}
                    aria-label={`Enable ${p.label} pack`}
                    onClick={() =>
                      save(() =>
                        updateEli((l) => setEliPack(l, p.id, !enabled)),
                      ).then((ok) => {
                        if (ok && !enabled)
                          setNotice(`${p.label} added to play.`);
                        if (ok && enabled) {
                          if (pack === p.id) setPack("all");
                          setNotice(
                            `${p.label} left out. Individual picture choices are kept.`,
                          );
                        }
                      })
                    }
                  >
                    {enabled ? <Check size={18} /> : <Plus size={18} />}
                    {enabled ? "In play · tap to leave out" : "Add to play"}
                  </button>
                  <button
                    className="text-button"
                    onClick={async () => {
                      if (
                        !enabled &&
                        !(await save(() =>
                          updateEli((l) => setEliPack(l, p.id, true)),
                        ))
                      )
                        return;
                      setPack(p.id);
                      setCategory("All pictures");
                      setView("welcome");
                      setNotice(
                        `Practising ${p.label}. Choose a picture game.`,
                      );
                    }}
                  >
                    Practise this pack <ArrowRight size={16} />
                  </button>
                </article>
              );
            })}
          </div>
        </section>
      )}
      {view === "welcome" && (
        <>
          <div className="eli-welcome panel">
            <div className="eli-welcome-art" aria-hidden="true">
              {["cat", "apple", "star"].map((id) => (
                <div key={id}>
                  <PictureArt
                    picture={starterPictures.find((p) => p.id === id)!}
                    hiddenLabel
                  />
                  <span>{starterPictures.find((p) => p.id === id)!.label}</span>
                </div>
              ))}
            </div>
            <div>
              <span className="eyebrow">ELI’S LITTLE WORLD</span>
              <h2>Look. Point. Discover.</h2>
              <p>
                Clear, lifelike pictures and simple shapes. A calm little space
                to take your time and discover together.
              </p>
              <span className="eli-soft-badge">
                <Heart size={14} /> No timer. No pressure.
              </span>
            </div>
          </div>
          <div className="eli-game-types">
            <button
              className="eli-mode-card panel"
              onClick={() => start("find")}
            >
              <span className="eli-mode-icon">
                <Search />
              </span>
              <h2>Find it</h2>
              <p>
                “Where’s the cat?”
                <br />
                Tap the matching picture.
              </p>
              <span>
                Let’s find it <ArrowRight size={17} />
              </span>
            </button>
            <button
              className="eli-mode-card panel"
              onClick={() => start("name")}
            >
              <span className="eli-mode-icon peach">
                <Eye />
              </span>
              <h2>Name it</h2>
              <p>
                “What can you see?”
                <br />
                One big picture, one little word.
              </p>
              <span>
                Let’s name it <ArrowRight size={17} />
              </span>
            </button>
            <button
              className="eli-mode-card panel"
              onClick={() => start("match")}
            >
              <span className="eli-mode-icon rose">
                <Copy />
              </span>
              <h2>Match Pair</h2>
              <p>
                Turn over two cards.
                <br />
                Can you find the pair?
              </p>
              <span>
                Let’s match <ArrowRight size={17} />
              </span>
            </button>
            <button
              className="eli-mode-card panel"
              onClick={() => start("yes-no")}
            >
              <span className="eli-mode-icon sky">
                <CircleHelp />
              </span>
              <h2>Yes or No</h2>
              <p>
                “Is this a rabbit?”
                <br />
                Look closely and choose.
              </p>
              <span>
                Let’s choose <ArrowRight size={17} />
              </span>
            </button>
            <button
              className="eli-mode-card panel"
              onClick={() => start("colour")}
            >
              <span className="eli-mode-icon yellow">
                <Palette />
              </span>
              <h2>Find the Colour</h2>
              <p>
                “Where’s the blue?”
                <br />
                Tap the matching colour.
              </p>
              <span>
                Let’s find colours <ArrowRight size={17} />
              </span>
            </button>
          </div>
          <section className="panel eli-play-settings">
            <h2>Make it just right</h2>
            <div className="eli-settings-grid">
              {packPicker}
              <label>
                Pictures to practise
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  <option>All pictures</option>
                  {pictureCategories.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </label>
              <label>
                Tiles to choose from
                <select
                  value={library.choices}
                  onChange={(e) => {
                    const choices = Number(e.target.value) as EliChoiceCount;
                    save(() =>
                      updateEli((l) => {
                        l.choices = choices;
                      }),
                    );
                  }}
                >
                  {eliChoiceCounts.map((count) => (
                    <option key={count} value={count}>
                      {count === 2
                        ? "2 · A gentle start"
                        : count === 3
                          ? "3 · A little more choice"
                          : count === 4
                            ? "4 · Ready for more"
                            : `${count} tiles`}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className="toggle">
              <input
                type="checkbox"
                checked={library.showWords}
                onChange={(e) => {
                  const checked = e.target.checked;
                  save(() =>
                    updateEli((l) => {
                      l.showWords = checked;
                    }),
                  );
                }}
              />{" "}
              Show words under choices in Find it
            </label>
            <p className="muted">
              {pool.length} pictures ready in this group. Five finds per game;
              no wrong-answer penalty. Names and pictures stay separate from the
              family scoreboard.
            </p>
            {pool.length >= 2 && pool.length < library.choices && (
              <p className="muted" role="status">
                This group has only {pool.length} pictures, so Find it will show{" "}
                {pool.length} tiles.
              </p>
            )}
            <button className="text-button" onClick={() => setView("library")}>
              Choose pictures or add your own <ArrowRight size={16} />
            </button>
            <button className="text-button" onClick={() => setView("packs")}>
              Explore six expansion packs <Plus size={16} />
            </button>
          </section>
        </>
      )}
      {(["find", "name", "match", "yes-no", "colour"] as const).includes(
        view as "find" | "name" | "match" | "yes-no" | "colour",
      ) && (
        <>
          <button
            className="text-button eli-back"
            onClick={() => {
              setView("welcome");
              window.speechSynthesis?.cancel();
            }}
          >
            <ArrowLeft size={18} /> Back to Eli Zone
          </button>
          {view === "find" &&
            question &&
            (complete ? (
              <div className="panel eli-complete">
                <span aria-hidden="true">🌟</span>
                <h2>Lovely finding, Eli!</h2>
                <p>Five little discoveries. Ready for some more?</p>
                <button className="primary" onClick={() => start("find")}>
                  Play again <ArrowRight size={18} />
                </button>
                <button
                  className="text-button"
                  onClick={() => setView("welcome")}
                >
                  All done for now
                </button>
              </div>
            ) : (
              <div className="panel eli-play-panel">
                <div className="eli-round-top">
                  <span>FIND IT</span>
                  <span>{round} of 5</span>
                </div>
                <h2 ref={gameHeadingRef} tabIndex={-1}>
                  Find the <strong>{recognitionWord(question.target)}</strong>
                </h2>
                <button
                  className="secondary eli-say"
                  onClick={() =>
                    say(`Find the ${recognitionWord(question.target)}`)
                  }
                >
                  <Volume2 size={18} /> Hear the word
                </button>
                <div
                  className={`eli-choices choices-${question.options.length}`}
                >
                  {question.options.map((p) => (
                    <button
                      key={p.id}
                      aria-label={`Choose ${p.label}`}
                      className={`eli-choice ${correct && p.id === selected ? "found" : ""}`}
                      disabled={correct}
                      onClick={() => setSelected(p.id)}
                    >
                      <PictureArt picture={p} hiddenLabel />
                      {library.showWords && <span>{p.label}</span>}
                      {correct && p.id === selected && (
                        <span className="eli-found-check" aria-hidden="true">
                          <Check />
                        </span>
                      )}
                    </button>
                  ))}
                </div>
                <div className="eli-feedback" role="status">
                  {correct ? (
                    <>
                      <strong>
                        That’s it! You found the{" "}
                        {recognitionWord(question.target)}.
                      </strong>
                      <button
                        ref={feedbackRef}
                        className="primary"
                        onClick={next}
                      >
                        {round === 5 ? "All found!" : "Next picture"}{" "}
                        <ArrowRight size={18} />
                      </button>
                    </>
                  ) : (
                    <p>
                      {selected
                        ? `Have another look. Where’s the ${recognitionWord(question.target)}?`
                        : "Look at the pictures. Tap the one you see."}
                    </p>
                  )}
                </div>
              </div>
            ))}
          {view === "name" && naming && (
            <div className="panel eli-play-panel eli-name-panel">
              <span className="eyebrow">NAME IT</span>
              <h2>What can you see?</h2>
              <PictureArt picture={naming} hiddenLabel />
              <div className="eli-naming-word" aria-live="polite">
                {revealed ? naming.label : "Have a little think together."}
              </div>
              <div className="eli-name-actions">
                {revealed ? (
                  <button
                    className="secondary"
                    onClick={() => say(naming.label)}
                  >
                    <Volume2 size={18} /> Hear the word
                  </button>
                ) : (
                  <button
                    className="secondary"
                    onClick={() => setRevealed(true)}
                  >
                    <Eye size={18} /> Show the word
                  </button>
                )}
                <button className="primary" onClick={nextName}>
                  Next picture <ArrowRight size={18} />
                </button>
              </div>
              <p className="muted">
                Say it, point to it, or make its sound. Every little discovery
                counts.
              </p>
            </div>
          )}
          {view === "match" && matchCards.length > 0 && (
            <div className="panel eli-play-panel eli-match-panel">
              <div className="eli-round-top">
                <span>MATCH PAIR</span>
                <span>{matched.size} of {matchCards.length / 2} pairs</span>
              </div>
              <h2 ref={gameHeadingRef} tabIndex={-1}>
                {matchComplete ? "You found every pair!" : "Find the matching pictures"}
              </h2>
              <p className="eli-game-prompt">
                {matchComplete
                  ? "Lovely remembering, Eli."
                  : "Turn over two cards. If they match, they stay together."}
              </p>
              <div className="eli-match-grid" aria-label="Matching cards">
                {matchCards.map((card) => {
                  const open =
                    flipped.includes(card.key) || matched.has(card.picture.id);
                  return (
                    <button
                      key={card.key}
                      className={`eli-match-card ${open ? "open" : ""} ${matched.has(card.picture.id) ? "matched" : ""}`}
                      aria-label={open ? card.picture.label : "Hidden picture"}
                      disabled={
                        matchComplete ||
                        matched.has(card.picture.id) ||
                        flipped.length === 2 ||
                        flipped.includes(card.key)
                      }
                      onClick={() => setFlipped((current) => [...current, card.key])}
                    >
                      <span className="eli-match-back" aria-hidden="true">
                        <Sparkles />
                      </span>
                      <span className="eli-match-front">
                        <PictureArt picture={card.picture} hiddenLabel />
                        <strong>{card.picture.label}</strong>
                        {matched.has(card.picture.id) && <Check aria-hidden="true" />}
                      </span>
                    </button>
                  );
                })}
              </div>
              <div className="eli-feedback" role="status">
                {matchComplete ? (
                  <button className="primary" onClick={() => start("match")}>
                    Play again <ArrowRight size={18} />
                  </button>
                ) : (
                  <p>{flipped.length === 1 ? "Now find its matching picture." : "Tap a card to peek underneath."}</p>
                )}
              </div>
            </div>
          )}
          {view === "yes-no" && yesNo &&
            (complete ? (
              <div className="panel eli-complete">
                <span aria-hidden="true">🌟</span>
                <h2>Brilliant choosing, Eli!</h2>
                <p>Five careful looks. Ready for some more?</p>
                <button className="primary" onClick={() => start("yes-no")}>
                  Play again <ArrowRight size={18} />
                </button>
                <button className="text-button" onClick={() => setView("welcome")}>
                  All done for now
                </button>
              </div>
            ) : (
              <div className="panel eli-play-panel eli-yes-no-panel">
                <div className="eli-round-top">
                  <span>YES OR NO</span>
                  <span>{round} of 5</span>
                </div>
                <h2 ref={gameHeadingRef} tabIndex={-1}>
                  Is this <strong>{yesNo.word}</strong>?
                </h2>
                <button
                  className="secondary eli-say"
                  onClick={() => say(`Is this ${yesNo.word}?`)}
                >
                  <Volume2 size={18} /> Hear the question
                </button>
                <div className="eli-question-picture">
                  <PictureArt picture={yesNo.target} hiddenLabel />
                </div>
                <div className="eli-yes-no-actions">
                  <button
                    className={yesNoAnswer === true ? (yesNoCorrect ? "correct" : "try-again") : ""}
                    disabled={yesNoCorrect}
                    onClick={() => setYesNoAnswer(true)}
                  >
                    <Check size={25} /> Yes
                  </button>
                  <button
                    className={yesNoAnswer === false ? (yesNoCorrect ? "correct" : "try-again") : ""}
                    disabled={yesNoCorrect}
                    onClick={() => setYesNoAnswer(false)}
                  >
                    <CircleHelp size={25} /> No
                  </button>
                </div>
                <div className="eli-feedback" role="status">
                  {yesNoCorrect ? (
                    <>
                      <strong>That’s right! It’s {recognitionWord(yesNo.target)}.</strong>
                      <button ref={feedbackRef} className="primary" onClick={nextYesNo}>
                        {round === 5 ? "All done!" : "Next picture"} <ArrowRight size={18} />
                      </button>
                    </>
                  ) : (
                    <p>{yesNoAnswer === null ? "Look at the picture, then choose yes or no." : "Have another look and try again."}</p>
                  )}
                </div>
              </div>
            ))}
          {view === "colour" && colour &&
            (complete ? (
              <div className="panel eli-complete">
                <span aria-hidden="true">🎨</span>
                <h2>Lovely colours, Eli!</h2>
                <p>Five bright finds. Ready for some more?</p>
                <button className="primary" onClick={() => start("colour")}>
                  Play again <ArrowRight size={18} />
                </button>
                <button className="text-button" onClick={() => setView("welcome")}>
                  All done for now
                </button>
              </div>
            ) : (
              <div className="panel eli-play-panel eli-colour-panel">
                <div className="eli-round-top">
                  <span>FIND THE COLOUR</span>
                  <span>{round} of 5</span>
                </div>
                <h2 ref={gameHeadingRef} tabIndex={-1}>
                  Find <strong>{recognitionWord(colour.target)}</strong>
                </h2>
                <button
                  className="secondary eli-say"
                  onClick={() => say(`Find ${recognitionWord(colour.target)}`)}
                >
                  <Volume2 size={18} /> Hear the colour
                </button>
                <div className="eli-colour-choices">
                  {colour.options.map((picture) => (
                    <button
                      key={picture.id}
                      className={`${colourSelected === picture.id ? "selected" : ""} ${colourCorrect && colourSelected === picture.id ? "found" : ""}`}
                      aria-label={`Choose ${picture.label}`}
                      disabled={colourCorrect}
                      onClick={() => setColourSelected(picture.id)}
                    >
                      <PictureArt picture={picture} hiddenLabel />
                      <strong>{picture.label.replace(" colour", "")}</strong>
                      {colourCorrect && colourSelected === picture.id && <Check aria-hidden="true" />}
                    </button>
                  ))}
                </div>
                <div className="eli-feedback" role="status">
                  {colourCorrect ? (
                    <>
                      <strong>That’s it! You found {recognitionWord(colour.target)}.</strong>
                      <button ref={feedbackRef} className="primary" onClick={nextColour}>
                        {round === 5 ? "All found!" : "Next colour"} <ArrowRight size={18} />
                      </button>
                    </>
                  ) : (
                    <p>{colourSelected ? `Have another look. Where’s ${recognitionWord(colour.target)}?` : "Look at the colours and tap the matching one."}</p>
                  )}
                </div>
              </div>
            ))}
          {!voice && (
            <p className="eli-voice-note">
              Read the prompt aloud together. “Hear the word” works when an
              English device voice is available; no microphone or online voice
              service is used.
            </p>
          )}
        </>
      )}
      {view === "library" && (
        <>
          <section className="panel eli-library-controls">
            <div>
              <h2>His picture dictionary</h2>
              <p>
                Montessori-inspired pictures: one clear subject, natural colours
                and an uncluttered background. Untick a picture to leave it out
                of both games. Your personal pictures are unchanged.
              </p>
            </div>
            <div className="eli-settings-grid">
              {packPicker}
              <label>
                Search pictures
                <input
                  type="search"
                  placeholder="Cat, apple, car…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </label>
              <label>
                Category
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  <option>All pictures</option>
                  {pictureCategories.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </label>
            </div>
            <p className="eli-library-count">
              {playablePictures(library).length} in play · {pictures.length}{" "}
              pictures saved · {library.pictures.length} of 100 personal
              pictures
            </p>
          </section>
          <details className="panel eli-add-picture">
            <summary>
              <ImagePlus size={20} /> Add a familiar picture <Plus size={18} />
            </summary>
            <p>
              A favourite toy, a pet, or something from home. A clear picture of
              one thing works best. Photos stay on this device and aren’t added
              to cloud backups.
            </p>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!photo || busy) return;
                setBusy(true);
                const ok = await save(
                  () =>
                    updateEli((l) => {
                      if (l.pictures.length >= 100)
                        throw new Error(
                          "You can save up to 100 personal pictures.",
                        );
                      const name = label.trim();
                      if (!name || name.length > 40)
                        throw new Error(
                          "Give the picture a name of 1–40 characters.",
                        );
                      if (
                        allPictures(l).some(
                          (p) => p.label.toLowerCase() === name.toLowerCase(),
                        )
                      )
                        throw new Error(
                          "That word already has a picture. Use a more specific name so choices aren’t confusing.",
                        );
                      l.pictures.push({
                        id: `custom:${crypto.randomUUID()}`,
                        label: name,
                        category: photoCategory,
                        color: "#8b78b4",
                        image: photo,
                      });
                    }),
                  "Picture saved. It’s ready to practise!",
                );
                if (ok) {
                  setLabel("");
                  setPhoto(null);
                  if (photoRef.current) photoRef.current.value = "";
                  setCategory("All pictures");
                  setSearch("");
                }
                setBusy(false);
              }}
            >
              <div className="eli-settings-grid">
                <label>
                  Picture word
                  <input
                    value={label}
                    maxLength={40}
                    required
                    placeholder="e.g. Teddy"
                    onChange={(e) => setLabel(e.target.value)}
                  />
                </label>
                <label>
                  Picture category
                  <select
                    value={photoCategory}
                    onChange={(e) =>
                      setPhotoCategory(e.target.value as PictureCategory)
                    }
                  >
                    {pictureCategories.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </label>
              </div>
              <label>
                Choose a picture
                <input
                  ref={photoRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  disabled={busy}
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    setPhoto(null);
                    if (!file) return;
                    setBusy(true);
                    try {
                      setPhoto(await preparePicture(file));
                      setNotice("Picture ready. Give it a word and save it.");
                    } catch (error) {
                      setNotice(
                        error instanceof Error
                          ? error.message
                          : "This image couldn’t be opened.",
                      );
                    }
                    setBusy(false);
                  }}
                />
              </label>
              {photo && (
                <img
                  className="eli-upload-preview"
                  src={photo}
                  alt="Your new picture preview"
                />
              )}
              <p className="muted">
                JPG, PNG or WebP · up to 8 MB. Pictures are resized for offline
                use and photo metadata is stripped.
              </p>
              <button
                className="primary"
                disabled={
                  !photo ||
                  !label.trim() ||
                  busy ||
                  library.pictures.length >= 100
                }
                type="submit"
              >
                {busy ? "Preparing picture…" : "Save picture"}{" "}
                <Check size={18} />
              </button>
            </form>
          </details>
          <div className="eli-library-grid">
            {visiblePictures.map((p) => (
              <article
                key={p.id}
                className={`panel eli-library-card ${library.hidden.includes(p.id) ? "excluded" : ""}`}
              >
                <PictureArt picture={p} />
                {editId === p.id ? (
                  <form
                    className="eli-rename"
                    onSubmit={async (e) => {
                      e.preventDefault();
                      const ok = await save(
                        () =>
                          updateEli((l) => {
                            const name = editLabel.trim();
                            if (!name || name.length > 40)
                              throw new Error(
                                "Give the picture a word of 1–40 characters.",
                              );
                            if (
                              allPictures(l).some(
                                (x) =>
                                  x.id !== p.id &&
                                  x.label.toLowerCase() === name.toLowerCase(),
                              )
                            )
                              throw new Error(
                                "Choose a word that isn’t already in the library.",
                              );
                            const item = l.pictures.find((x) => x.id === p.id);
                            if (item) item.label = name;
                          }),
                        "Picture word updated.",
                      );
                      if (ok) setEditId(null);
                    }}
                  >
                    <input
                      aria-label={`New word for ${p.label}`}
                      value={editLabel}
                      maxLength={40}
                      required
                      onChange={(e) => setEditLabel(e.target.value)}
                    />
                    <button className="secondary" type="submit">
                      Save word
                    </button>
                    <button
                      className="text-button"
                      type="button"
                      onClick={() => setEditId(null)}
                    >
                      Cancel
                    </button>
                  </form>
                ) : (
                  <>
                    <h3>{p.label}</h3>
                    <p>{p.category}</p>
                  </>
                )}
                <label className="eli-included">
                  <input
                    type="checkbox"
                    aria-label={`Include ${p.label} in games`}
                    checked={!library.hidden.includes(p.id)}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      save(() =>
                        updateEli((l) => {
                          l.hidden = checked
                            ? l.hidden.filter((id) => id !== p.id)
                            : [...new Set([...l.hidden, p.id])];
                        }),
                      );
                    }}
                  />{" "}
                  {library.hidden.includes(p.id) ? "Left out" : "In play"}
                </label>
                {p.image && editId !== p.id && (
                  <button
                    className="text-button"
                    onClick={() => {
                      setEditId(p.id);
                      setEditLabel(p.label);
                    }}
                  >
                    Edit word
                  </button>
                )}
              </article>
            ))}
          </div>
          {!visiblePictures.length && (
            <div className="panel eli-empty">
              <BookOpen />
              <h2>No pictures here yet.</h2>
              <p>
                Try a different category, clear your search, or add a familiar
                picture above.
              </p>
            </div>
          )}
          <section className="panel eli-backup">
            <h2>Keep his pictures safe</h2>
            <p>
              Pictures stay in this browser, even after a Docker rebuild. Export
              a separate Eli Zone backup before clearing browser data or moving
              to another device. The usual GameHub backup doesn’t include this
              library.
            </p>
            <div className="button-row">
              <button className="primary" onClick={exportLibrary}>
                <Download size={18} /> Export pictures
              </button>
              <button
                className="secondary"
                onClick={() => importRef.current?.click()}
              >
                <Upload size={18} /> Import pictures
              </button>
            </div>
            <input
              ref={importRef}
              type="file"
              hidden
              accept="application/json,.json"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (!file) return;
                try {
                  if (file.size > 40 * 1024 * 1024)
                    throw new Error(
                      "Choose an Eli Zone backup smaller than 40 MB.",
                    );
                  setImporting(
                    validateEliBackup(JSON.parse(await file.text())),
                  );
                  setNotice(
                    "Backup checked. Review it below before adding pictures.",
                  );
                } catch (error) {
                  setImporting(null);
                  setNotice(
                    error instanceof Error
                      ? error.message
                      : "This backup couldn’t be opened.",
                  );
                }
              }}
            />
            {importing && (
              <div className="eli-import-review">
                <h3>
                  {importing.pictures.length} personal pictures in this backup
                </h3>
                <p>
                  Import adds new pictures only. Your existing pictures, words
                  and play settings won’t be replaced. Duplicate words are
                  skipped.
                </p>
                <button
                  className="primary"
                  onClick={async () => {
                    let added = 0;
                    const ok = await save(() =>
                      updateEli((l) => {
                        const ids = new Set(allPictures(l).map((p) => p.id));
                        const words = new Set(
                          allPictures(l).map((p) => p.label.toLowerCase()),
                        );
                        const additions = importing.pictures.filter((p) => {
                          if (ids.has(p.id) || words.has(p.label.toLowerCase()))
                            return false;
                          ids.add(p.id);
                          words.add(p.label.toLowerCase());
                          return true;
                        });
                        if (l.pictures.length + additions.length > 100)
                          throw new Error(
                            "This import would exceed 100 personal pictures.",
                          );
                        l.pictures.push(...additions);
                        l.hidden.push(
                          ...additions
                            .filter((p) => importing.hidden.includes(p.id))
                            .map((p) => p.id),
                        );
                        added = additions.length;
                      }),
                    );
                    if (ok) {
                      setImporting(null);
                      setNotice(
                        `${added} new pictures added. Existing pictures are unchanged.`,
                      );
                    }
                  }}
                >
                  Add new pictures
                </button>
                <button
                  className="text-button"
                  onClick={() => setImporting(null)}
                >
                  Cancel import
                </button>
              </div>
            )}
          </section>
        </>
      )}
    </section>
  );
}
