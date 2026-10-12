import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { useRegisterSW } from "virtual:pwa-register/react";
import {
  ArrowLeft,
  ArrowRight,
  Calculator,
  Check,
  ChevronRight,
  Cloud,
  CloudOff,
  Dices,
  Download,
  Gamepad2,
  History,
  Home,
  Info,
  Layers,
  Menu,
  Minus,
  Pause,
  Play,
  Plus,
  RefreshCw,
  Settings,
  Shapes,
  Shuffle,
  Sparkles,
  Timer,
  Trash2,
  Trophy,
  Users,
  WifiOff,
  X,
  Zap,
} from "lucide-react";
import { db, initialize, update, exportState, validateBackup } from "./db";
import {
  activeRound,
  acceptAnswer,
  award,
  eliminate,
  finishSession,
  guessCard,
  newSession,
  pause,
  randomGame,
  resolveChallenge,
  startRound,
  toggleTimer,
  type State,
  type Round,
} from "./engine";
import { games, packs, categoriesFor, type GameId, type PackId } from "./data";
import { cardLabel, newDeck, pick, randomInt, letters } from "./random";
import { cloud, backup, listBackups, restore } from "./cloud";
import { EliZone } from "./EliZone";
import { ImmyZone } from "./ImmyZone";
import { NoughtsCrosses } from "./NoughtsCrosses";
import { UnoZone } from "./UnoZone";
import {
  Hangman,
  RockPaperScissors,
  WouldYouRather,
  partyGameCards,
} from "./PartyGames";
import { TriviaQuiz } from "./SocialGames";

type Screen =
  | "home"
  | "games"
  | "tools"
  | "scores"
  | "packs"
  | "history"
  | "settings"
  | "eli"
  | "immy"
  | "uno"
  | "would-you-rather"
  | "hangman"
  | "trivia"
  | "rock-paper-scissors"
  | "noughts-crosses"
  | "play";
type Modal = {
  type: "players" | "setup" | "rules" | "session" | "confirm";
  game?: GameId;
  title?: string;
  body?: string;
  action?: () => Promise<void>;
};
const avatars = [
  "🌞",
  "🦊",
  "🐼",
  "🐸",
  "🦁",
  "🐨",
  "🐙",
  "🦋",
  "🚀",
  "🍉",
  "🌵",
  "🐝",
  "🌸",
];
const nav = [
  { id: "home", label: "Home", icon: Home },
  { id: "games", label: "All games", icon: Gamepad2 },
  { id: "tools", label: "Game tools", icon: Dices },
  { id: "scores", label: "Scoreboard", icon: Trophy },
  { id: "packs", label: "Game packs", icon: Layers },
  { id: "history", label: "Our memories", icon: History },
  { id: "eli", label: "Eli Zone", icon: Shapes },
  { id: "immy", label: "Immy Zone", icon: Calculator },
  { id: "uno", label: "Uno variants", icon: Layers },
] as const;
type InstallEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
};
function initialScreen(): Screen {
  const name = location.hash.slice(1);
  return [
    "home",
    "games",
    "tools",
    "scores",
    "packs",
    "history",
    "settings",
    "eli",
    "immy",
    "uno",
    "would-you-rather",
    "hangman",
    "trivia",
    "rock-paper-scissors",
    "noughts-crosses",
    "play",
  ].includes(name)
    ? (name as Screen)
    : "home";
}
function ModalShell({
  title,
  close,
  children,
}: {
  title: string;
  close: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const element = ref.current;
    element?.querySelector<HTMLElement>("input,button,select")?.focus();
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "Tab" && element) {
        const focusables = Array.from(
          element.querySelectorAll<HTMLElement>(
            'button:not(:disabled),input,select,textarea,[tabindex="0"]',
          ),
        );
        const first = focusables[0],
          last = focusables.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", handler);
    return () => {
      document.removeEventListener("keydown", handler);
      document.body.style.overflow = previousOverflow;
      previous?.focus();
    };
  }, [close]);
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        ref={ref}
      >
        <div className="modal-heading">
          <h2 id="modal-title">{title}</h2>
          <button
            className="icon-button"
            aria-label="Close dialog"
            onClick={close}
          >
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
function CardFace({
  card,
  className = "",
}: {
  card: Round["card"];
  className?: string;
}) {
  return (
    <div
      className={`playing-card ${card?.suit === "♥" || card?.suit === "♦" ? "red" : ""} ${className}`}
    >
      <span>{card ? cardLabel(card) : "?"}</span>
      <strong>{card?.suit || "♠"}</strong>
      <span>{card ? cardLabel(card) : "?"}</span>
    </div>
  );
}
function Pill({ children }: { children: ReactNode }) {
  return <span className="pill">{children}</span>;
}
function DiceFace({ value }: { value: number }) {
  return (
    <div className="dice-face" aria-label={`Dice: ${value}`}>
      {Array.from({ length: 9 }, (_, i) => (
        <span
          key={i}
          className={
            (
              {
                1: [4],
                2: [0, 8],
                3: [0, 4, 8],
                4: [0, 2, 6, 8],
                5: [0, 2, 4, 6, 8],
                6: [0, 2, 3, 5, 6, 8],
              } as Record<number, number[]>
            )[value].includes(i)
              ? "pip"
              : ""
          }
        />
      ))}
    </div>
  );
}

export default function App() {
  const state = useLiveQuery(() => db.state.get("main"), []);
  const [screen, setScreen] = useState<Screen>(initialScreen),
    [modal, setModal] = useState<Modal | null>(null),
    [menu, setMenu] = useState(false),
    [toast, setToast] = useState(""),
    [fatal, setFatal] = useState(""),
    [online, setOnline] = useState(navigator.onLine),
    [ready, setReady] = useState(false),
    [now, setNow] = useState(Date.now()),
    [install, setInstall] = useState<InstallEvent | null>(null),
    [email, setEmail] = useState(""),
    [user, setUser] = useState<string | null>(null),
    [syncStatus, setSyncStatus] = useState(""),
    [cloudBackups, setCloudBackups] = useState<
      { id: string; device_name: string; updated_at: string }[]
    >([]),
    [busy, setBusy] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<string | null>(null),
    [answer, setAnswer] = useState(""),
    [custom, setCustom] = useState(""),
    [sessionName, setSessionName] = useState("Game night"),
    [resetSession, setResetSession] = useState(true),
    [challenger, setChallenger] = useState("");
  const navigationRef = useRef<HTMLElement>(null);
  const fileRef = useRef<HTMLInputElement>(null),
    expireRef = useRef(false),
    syncRef = useRef(false);
  const {
    offlineReady: [offlineReady],
    needRefresh: [needsRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisterError: () =>
      setSyncStatus(
        "Offline caching is unavailable. Keep this tab open to play.",
      ),
  });
  const round = state ? activeRound(state) : undefined;
  const current = state?.players.find((p) => p.id === round?.current);
  const session = state?.sessions.find((s) => s.id === state.sessionId);
  const remaining = round?.deadline
    ? Math.max(0, Math.ceil((round.deadline - now) / 1000))
    : Math.ceil(round?.remaining ?? 0);
  const toolRemaining = state?.toolTimer.deadline
    ? Math.max(0, Math.ceil((state.toolTimer.deadline - now) / 1000))
    : Math.ceil(state?.toolTimer.remaining ?? 60);
  const notify = (message: string) => setToast(message);
  async function run(action: () => Promise<unknown>, success?: string) {
    try {
      await action();
      if (success) notify(success);
      return true;
    } catch (error) {
      notify(
        error instanceof Error
          ? error.message
          : "Something went wrong. Please try again.",
      );
      return false;
    }
  }
  function go(next: Screen) {
    setScreen(next);
    location.hash = next;
    setMenu(false);
    window.scrollTo({ top: 0, behavior: "instant" });
  }
  function choose(game: GameId) {
    if (round?.status === "active") {
      go("play");
      notify(
        "Your current round is waiting. Finish or end it before starting another.",
      );
      return;
    }
    setModal({ type: "setup", game });
  }
  function confirm(title: string, body: string, action: () => Promise<void>) {
    setModal({ type: "confirm", title, body, action });
  }
  useEffect(() => {
    initialize().catch((e) => setFatal(e.message));
    const hash = () => setScreen(initialScreen());
    const connectivity = () => setOnline(navigator.onLine);
    const installHandler = (event: Event) => {
      event.preventDefault();
      setInstall(event as InstallEvent);
    };
    addEventListener("hashchange", hash);
    addEventListener("online", connectivity);
    addEventListener("offline", connectivity);
    addEventListener("beforeinstallprompt", installHandler);
    if ("serviceWorker" in navigator)
      navigator.serviceWorker.ready.then(() => setReady(true));
    return () => {
      removeEventListener("hashchange", hash);
      removeEventListener("online", connectivity);
      removeEventListener("offline", connectivity);
      removeEventListener("beforeinstallprompt", installHandler);
    };
  }, []);
  useEffect(() => {
    if (!round?.deadline && !state?.toolTimer.deadline) return;
    setNow(Date.now());
    const clock = setInterval(() => setNow(Date.now()), 150);
    return () => clearInterval(clock);
  }, [round?.deadline, state?.toolTimer.deadline]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 4500);
    return () => clearTimeout(t);
  }, [toast]);
  useEffect(() => {
    if (
      !menu ||
      !window.matchMedia(
        "(max-width: 760px), (max-width: 980px) and (max-height: 500px)",
      ).matches
    )
      return;
    const previous = document.activeElement as HTMLElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const drawer = navigationRef.current;
    const buttons = Array.from(
      drawer?.querySelectorAll<HTMLElement>("a,button") ?? [],
    );
    buttons[0]?.focus();
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenu(false);
      if (event.key !== "Tab") return;
      if (event.shiftKey && document.activeElement === buttons[0]) {
        event.preventDefault();
        buttons.at(-1)?.focus();
      } else if (!event.shiftKey && document.activeElement === buttons.at(-1)) {
        event.preventDefault();
        buttons[0]?.focus();
      }
    };
    document.addEventListener("keydown", handler);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handler);
      previous?.focus();
    };
  }, [menu]);
  useEffect(() => {
    if (!cloud) return;
    cloud.auth
      .getSession()
      .then(({ data }) => setUser(data.session?.user.email ?? null));
    const { data } = cloud.auth.onAuthStateChange((_event, session) =>
      setUser(session?.user.email ?? null),
    );
    return () => data.subscription.unsubscribe();
  }, []);
  useEffect(() => {
    if (
      !cloud ||
      !user ||
      !online ||
      !state ||
      state.lastBackupRevision === state.revision
    )
      return;
    let cancelled = false;
    let retryTimer: number | undefined;
    const sync = async () => {
      if (cancelled || syncRef.current) return;
      syncRef.current = true;
      try {
        await backup();
        setSyncStatus("Scores and game progress backed up");
      } catch {
        setSyncStatus(
          "Backup will retry. Your games are saved on this device.",
        );
        if (!cancelled && navigator.onLine) {
          retryTimer = window.setTimeout(sync, 30_000);
        }
      } finally {
        syncRef.current = false;
      }
    };
    const initialTimer = window.setTimeout(sync, 2500);
    return () => {
      cancelled = true;
      window.clearTimeout(initialTimer);
      if (retryTimer !== undefined) window.clearTimeout(retryTimer);
    };
  }, [state?.revision, user, online]);
  useEffect(() => {
    if (expireRef.current || !state) return;
    const expiredRound =
      round?.status === "active" &&
      round.deadline !== null &&
      round.deadline <= now;
    const expiredTool =
      state.toolTimer.deadline !== null && state.toolTimer.deadline <= now;
    if (!expiredRound && !expiredTool) return;
    expireRef.current = true;
    update((s) => {
      const r = activeRound(s);
      if (
        r?.status === "active" &&
        r.deadline !== null &&
        r.deadline <= Date.now()
      ) {
        if (r.game === "quick-stop") eliminate(s, r, r.current);
        else {
          r.deadline = null;
          r.remaining = 0;
        }
      }
      if (s.toolTimer.deadline !== null && s.toolTimer.deadline <= Date.now()) {
        s.toolTimer.deadline = null;
        s.toolTimer.remaining = 0;
      }
    })
      .catch((e) => notify(e.message))
      .finally(() => {
        expireRef.current = false;
      });
  }, [now, state, round]);
  async function saveFile() {
    await run(async () => {
      const data = await exportState();
      const url = URL.createObjectURL(
        new Blob([data], { type: "application/json" }),
      );
      const link = document.createElement("a");
      link.href = url;
      link.download = `gamehub-backup-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }, "Your backup is downloaded.");
  }
  async function loadFile(file: File) {
    if (file.size > 5000000) {
      notify("Choose a backup smaller than 5 MB.");
      return;
    }
    await run(async () => {
      const imported = validateBackup(JSON.parse(await file.text()));
      confirm(
        "Restore this backup?",
        "This replaces the players, scores and sessions on this device. Export your current games first if you want to keep them.",
        async () => {
          await db.state.put(imported);
          go("home");
          notify("Backup restored. Timers are paused.");
        },
      );
    });
  }
  const closeModal = useCallback(() => setModal(null), []);
  if (fatal)
    return (
      <div className="loading">
        <Dices size={48} />
        <h1>Let’s get you playing</h1>
        <p>GameHub needs local storage to save your games. {fatal}</p>
        <button className="primary" onClick={() => location.reload()}>
          Try again
        </button>
      </div>
    );
  if (!state)
    return (
      <div className="loading">
        <Dices size={48} />
        <h1>Unpacking the fun…</h1>
      </div>
    );
  const sorted = [...state.players].sort((a, b) => b.score - a.score);
  const typedAnswers = state.settings.quickStopAnswerMode === "typed";
  const answerControls = (
    <label className="answer-mode">
      Answer controls
      <select
        value={typedAnswers ? "typed" : "spoken"}
        disabled={!!round?.challenge}
        onChange={(e) => {
          const mode = e.target.value as "spoken" | "typed";
          run(() =>
            update((s) => {
              s.settings.quickStopAnswerMode = mode;
            }),
          ).then((ok) => {
            if (ok) setAnswer("");
          });
        }}
      >
        <option value="spoken">Tick / cross · spoken answers</option>
        <option value="typed">Type answers</option>
      </select>
    </label>
  );
  const champion =
    state.settings.target > 0
      ? sorted.find((p) => p.score >= state.settings.target)
      : undefined;
  const logoPlayer =
    state.players.find((player) => player.id === editingPlayer) ??
    state.players[0];
  function gameCard(
    game: (typeof games)[number] | (typeof partyGameCards)[number],
    action?: () => void,
  ) {
    return (
      <button
        key={game.id}
        className={`game-card ${game.color}`}
        onClick={action ?? (() => choose(game.id as GameId))}
      >
        <div className="game-art">
          <span>{game.icon}</span>
          <i />
          <b>✦</b>
        </div>
        <div className="game-card-copy">
          <small>{game.tag}</small>
          <h3>{game.name}</h3>
          <p>{game.description}</p>
          <div className="game-meta">
            <span>
              <Users size={14} />
              {game.players}
            </span>
            <ArrowRight size={19} />
          </div>
        </div>
      </button>
    );
  }
  function crew() {
    return (
      <section className="crew panel">
        <div className="section-title">
          <h2>Your holiday crew</h2>
          <span className="count">{state!.players.length}</span>
        </div>
        <p className="muted">Good games start with great company.</p>
        {state!.players.length ? (
          <div className="crew-list">
            {state!.players.slice(0, 4).map((p) => (
              <div key={p.id}>
                <span className="avatar">{p.avatar}</span>
                <strong>{p.name}</strong>
                <span>
                  {p.score} <small>pts</small>
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="crew-empty">
            <div className="avatar-party">
              <span>🦊</span>
              <span>🌞</span>
              <span>🐼</span>
            </div>
            <h3>Everyone’s invited.</h3>
            <p>
              Add your players and let the friendly
              <br />
              competition begin.
            </p>
          </div>
        )}
        <button
          className="secondary wide"
          onClick={() => {
            setEditingPlayer(state!.players[0]?.id ?? null);
            setModal({ type: "players" });
          }}
        >
          <Shapes size={17} />
          Change player logos
        </button>
        {state!.players.length > 0 && (
          <button className="text-button wide" onClick={() => go("scores")}>
            View scoreboard <ArrowRight size={15} />
          </button>
        )}
      </section>
    );
  }
  const title = {
    home: "Make time for a little fun.",
    games: "Find your next favourite.",
    tools: "A little help with the fun.",
    scores: "A little friendly competition.",
    packs: "More games. More good times.",
    history: "The good times, remembered.",
    settings: "Make yourself at home.",
    eli: "Eli Zone",
    immy: "Immy Zone",
    uno: "Uno variants",
    "would-you-rather": "Would you rather?",
    hangman: "Guess it before it’s drawn.",
    trivia: "Put your knowledge to the test.",
    "rock-paper-scissors": "Ready, set, choose.",
    "noughts-crosses": "Make your mark.",
    play:
      games.find((g) => g.id === round?.game)?.name ?? "Ready when you are.",
  }[screen];
  return (
    <div className="app-shell">
      <aside
        id="app-navigation"
        ref={navigationRef}
        inert={!!modal}
        className={`sidebar ${menu ? "open" : ""}`}
      >
        <button
          className="drawer-close icon-button"
          aria-label="Close navigation"
          onClick={() => setMenu(false)}
        >
          <X />
        </button>
        <a href="#home" className="brand" onClick={() => go("home")}>
          <span className="brand-icon">
            <Dices size={26} />
          </span>
          GameHub<span className="brand-dot">.</span>
        </a>
        <div className="sidebar-subtitle">GOOD TIMES, ANYWHERE</div>
        <div className="nav-label">YOUR GAME NIGHT</div>
        <nav aria-label="Main navigation">
          {nav.map((item) => (
            <button
              key={item.id}
              className={screen === item.id ? "selected" : ""}
              aria-current={screen === item.id ? "page" : undefined}
              onClick={() => go(item.id)}
            >
              <item.icon size={20} />
              {item.label}
              {screen === item.id && <span className="nav-dot" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-trip">
          <div className="trip-icon">✈</div>
          <h3>Take the fun with you.</h3>
          <p>
            On a plane. At the beach.
            <br />
            Around the kitchen table.
          </p>
          <button onClick={() => go("settings")}>
            Get ready for offline <ArrowRight size={14} />
          </button>
        </div>
        <div className="sidebar-bottom">
          <button
            className={screen === "settings" ? "selected" : ""}
            onClick={() => go("settings")}
          >
            <Settings size={19} />
            Settings & backup
          </button>
          <div className="offline-status">
            <span
              className={ready || offlineReady ? "green-dot" : "amber-dot"}
            />
            <span>
              {ready || offlineReady ? "Offline ready" : "Preparing offline…"}
              <small>
                {online ? "Saved on this device" : "You’re playing offline"}
              </small>
            </span>
            <CloudOff size={17} />
          </div>
        </div>
      </aside>
      {menu && (
        <button
          className="menu-shade"
          aria-label="Close navigation"
          onClick={() => setMenu(false)}
        />
      )}
      <div className="main-area" inert={menu || !!modal}>
        <header className="topbar">
          <button
            className="mobile-menu icon-button"
            onClick={() => setMenu(!menu)}
            aria-label={menu ? "Close navigation" : "Open navigation"}
            aria-expanded={menu}
            aria-controls="app-navigation"
          >
            <Menu />
          </button>
          <span className="breadcrumb">
            Your pocket-sized game night <Sparkles size={15} />
          </span>
          <div className="topbar-right">
            {round?.status === "active" && screen !== "play" && (
              <button className="resume-chip" onClick={() => go("play")}>
                <Play size={13} />
                Resume round
              </button>
            )}
            <button
              className="session-chip"
              onClick={() => setModal({ type: "session" })}
            >
              <span className="purple-dot" />
              {session?.name}
              <ChevronRight size={14} />
            </button>
            <button
              className="crew-chip"
              aria-label="Manage players"
              onClick={() => go("scores")}
            >
              <Users size={17} />
              <span>{state.players.length}</span>
            </button>
          </div>
        </header>
        <main id="main" className={`main-content screen-${screen}`}>
          <div className="page-heading">
            <div>
              <div className="eyebrow">
                {screen === "uno"
                  ? "A NEW TWIST ON CARD NIGHT"
                  : screen === "immy"
                    ? "FAST SUMS. BIG STREAKS."
                  : screen === "eli"
                    ? "A LITTLE WORLD TO EXPLORE"
                    : screen === "would-you-rather"
                      ? "PICK A SIDE. DEFEND YOUR CHOICE."
                      : screen === "hangman"
                        ? "ONE WORD. SIX CHANCES."
                      : screen === "trivia"
                          ? "QUESTIONS READY. THINKING CAPS ON."
                        : screen === "rock-paper-scissors"
                          ? "ONE PLAYER. THREE MOVES."
                        : screen === "noughts-crosses"
                          ? "THREE SQUARES. ONE WINNER."
                    : screen === "home"
                      ? "LESS SCROLLING. MORE LAUGHING."
                      : screen === "play"
                        ? "LET’S PLAY"
                        : screen === "history"
                          ? "YOUR HOLIDAY STORY"
                          : "THE GAME NIGHT ESSENTIALS"}
              </div>
              <h1>{title}</h1>
              <p>
                {screen === "uno"
                  ? "A little luck. A chain of swaps. Race to put every number in place."
                  : screen === "immy"
                    ? "Choose your tables, beat the clock and build a brilliant streak."
                  : screen === "eli"
                    ? "Simple pictures. Gentle games. Little discoveries together."
                    : screen === "would-you-rather"
                      ? "Kids or grown-ups, everyone gets a vote and an opinion."
                      : screen === "hangman"
                        ? "Pick a word pack, choose your letters and solve the puzzle."
                        : screen === "trivia"
                            ? "Choose a pack, answer together and chase the perfect round."
                          : screen === "rock-paper-scissors"
                            ? "Take on the computer and race to five wins."
                          : screen === "noughts-crosses"
                            ? "Play solo against the computer or pass the device to a friend."
                    : screen === "home"
                      ? "Bring your favourite people. We’ll bring the games."
                      : screen === "games"
                        ? "Pick a game, gather your people and jump right in."
                        : screen === "tools"
                          ? "Letters, numbers, dice and cards. All in your pocket."
                          : screen === "scores"
                            ? "Every point counts. Bragging rights included."
                            : screen === "packs"
                              ? "Save a pack now. Play it wherever the holiday takes you."
                              : screen === "history"
                                ? "Every round and every holiday champion, saved here."
                                : screen === "settings"
                                  ? "Your games are saved here, with or without Wi-Fi."
                                  : "Pass the phone around, or keep it in the middle of the table."}
              </p>
            </div>
            {(screen === "home" || screen === "games") && (
              <button
                className="secondary surprise"
                onClick={() => choose(randomGame())}
              >
                <Shuffle size={17} />
                Surprise us
              </button>
            )}
            {screen === "play" && (
              <button
                className="secondary"
                onClick={() => setModal({ type: "rules", game: round?.game })}
              >
                <Info size={17} />
                How to play
              </button>
            )}
            {(["would-you-rather", "hangman", "trivia", "rock-paper-scissors", "noughts-crosses"] as Screen[]).includes(screen) && (
              <button className="secondary" onClick={() => go("games")}>
                <ArrowLeft size={17} />
                All games
              </button>
            )}
          </div>
          {(screen === "home" || screen === "games") && (
            <button
              className="panel eli-home-banner"
              aria-label="Open Eli Zone"
              onClick={() => go("eli")}
            >
              <span className="eli-home-icon">
                <Shapes size={30} />
              </span>
              <span>
                <strong>Eli Zone</strong>
                <small>
                  A picture dictionary and gentle recognition games.
                </small>
              </span>
              <ArrowRight size={20} />
            </button>
          )}
          {(screen === "home" || screen === "games") && (
            <button
              className="panel eli-home-banner immy-home-banner"
              aria-label="Open Immy Zone"
              onClick={() => go("immy")}
            >
              <span className="eli-home-icon">
                <Calculator size={30} />
              </span>
              <span>
                <strong>Immy Zone</strong>
                <small>Pick your times tables and race through rapid-fire sums.</small>
              </span>
              <ArrowRight size={20} />
            </button>
          )}
          {screen === "eli" && <EliZone />}
          {screen === "immy" && <ImmyZone />}
          {screen === "uno" && <UnoZone state={state} />}
          {screen === "would-you-rather" && <WouldYouRather />}
          {screen === "hangman" && <Hangman />}
          {screen === "trivia" && <TriviaQuiz />}
          {screen === "rock-paper-scissors" && <RockPaperScissors />}
          {screen === "noughts-crosses" && <NoughtsCrosses />}
          {(screen === "home" || screen === "games") && (
            <button className="panel uno-banner" onClick={() => go("uno")}>
              <Layers size={30} />
              <span>
                <strong>Uno variants</strong>
                <small>
                  Two-player solitaire and solo practice · Race to 0–9
                </small>
              </span>
              <ArrowRight size={20} />
            </button>
          )}
          {(screen === "home" || screen === "games") && (
            <>
              {screen === "home" && (
                <div className="home-feature">
                  <section className="feature-card">
                    <div className="feature-copy">
                      <span className="feature-badge">
                        <Zap size={13} />
                        THE FAMILY FAVOURITE
                      </span>
                      <h2>
                        Quick thinking.
                        <br />
                        Big laughs.
                      </h2>
                      <p>
                        One letter. One category.
                        <br />
                        Who will be the last one standing?
                      </p>
                      <button
                        className="primary"
                        onClick={() => choose("quick-stop")}
                      >
                        Let’s play Quick Stop <ArrowRight size={18} />
                      </button>
                      <div className="feature-meta">
                        <span>
                          <Users size={14} />
                          2–12 players
                        </span>
                        <span>
                          <Timer size={14} />5 sec / turn
                        </span>
                      </div>
                    </div>
                    <div className="feature-art" aria-hidden="true">
                      <span className="art-star star-one">✦</span>
                      <span className="art-star star-two">✧</span>
                      <div className="letter-card">
                        <small>YOUR LETTER</small>
                        <strong>B</strong>
                        <span>THINK FAST!</span>
                      </div>
                      <div className="category-card">
                        <span>🍌</span>
                        <small>YOUR CATEGORY</small>
                        <strong>Fruit</strong>
                      </div>
                      <div className="bolt-bubble">⚡</div>
                      <div className="art-dot dot-one" />
                      <div className="art-dot dot-two" />
                    </div>
                  </section>
                  {crew()}
                </div>
              )}
              <section className="games-section">
                <div className="section-title">
                  <div>
                    <h2>
                      {screen === "home"
                        ? "A game for every kind of together."
                        : "Pick a game"}
                    </h2>
                    <p className="muted">
                      {screen === "home"
                        ? "A little competition. A lot of memories."
                        : "Plenty of ways to turn spare time into a good time."}
                    </p>
                  </div>
                  {screen === "home" && (
                    <button className="text-button" onClick={() => go("games")}>
                      All games <ArrowRight size={16} />
                    </button>
                  )}
                </div>
                <div
                  className={`games-grid ${screen === "home" ? "three" : ""}`}
                >
                  {(screen === "home"
                    ? games.filter((g) => g.id !== "quick-stop")
                    : games
                  ).map((game) => gameCard(game))}
                  {partyGameCards.map((game) =>
                    gameCard(game, () => go(game.id)),
                  )}
                </div>
              </section>
              {screen === "home" && (
                <div className="offline-banner">
                  <span className="offline-banner-icon">
                    <WifiOff size={23} />
                  </span>
                  <div>
                    <strong>
                      The best connection is the one around the table.
                    </strong>
                    <p>
                      {ready || offlineReady
                        ? "Your games are ready to travel. No Wi-Fi needed."
                        : "We’re saving the app for offline play. Leave this page open for a moment."}
                    </p>
                  </div>
                  <button className="text-button" onClick={() => go("packs")}>
                    Explore game packs <ArrowRight size={16} />
                  </button>
                </div>
              )}
            </>
          )}
          {screen === "scores" && (
            <>
              <div className="score-top">
                <div className="panel score-overview">
                  <span className="score-trophy">🏆</span>
                  <div>
                    <small>
                      {champion ? "HOLIDAY CHAMPION" : "THE RACE IS ON"}
                    </small>
                    <h2>
                      {champion
                        ? `${champion.name} takes the crown!`
                        : state.settings.target
                          ? `First to ${state.settings.target}. All to play for.`
                          : "Make every round count."}
                    </h2>
                    <p>
                      {champion
                        ? "Keep playing, or start a new session for a fresh competition."
                        : "Scores are shared across every game in this session."}
                    </p>
                  </div>
                </div>
                <button
                  className="primary"
                  onClick={() => {
                    setEditingPlayer(state.players[0]?.id ?? null);
                    setModal({ type: "players" });
                  }}
                >
                  <Shapes size={18} />
                  Change player logos
                </button>
              </div>
              {!state.players.length ? (
                <section className="empty-state panel">
                  <Users size={42} />
                  <h2>Who’s coming to game night?</h2>
                  <p>
                    Add at least two players for Quick Stop, Charades and Who Am
                    I.
                  </p>
                  <button
                    className="primary"
                    onClick={() => setModal({ type: "players" })}
                  >
                    Add your first player <Plus size={17} />
                  </button>
                </section>
              ) : (
                <div className="scoreboard">
                  {sorted.map((p, index) => (
                    <div className="score-row" key={p.id}>
                      <span className="rank">
                        {index === 0 && p.score > 0
                          ? "👑"
                          : String(index + 1).padStart(2, "0")}
                      </span>
                      <span className="avatar large">{p.avatar}</span>
                      <div className="player-info">
                        <h3>{p.name}</h3>
                        <span>
                          {index === 0 && p.score > 0
                            ? "Leading the way"
                            : p.score === 0
                              ? "Ready to play"
                              : "In it to win it"}
                        </span>
                        {state.settings.target > 0 && (
                          <div className="score-progress">
                            <i
                              style={{
                                width: `${Math.min(100, (p.score / state.settings.target) * 100)}%`,
                              }}
                            />
                          </div>
                        )}
                      </div>
                      <div className="score-controls">
                        <button
                          className="icon-button"
                          aria-label={`Subtract one point from ${p.name}`}
                          onClick={() =>
                            run(() =>
                              update((s) => {
                                s.players.find((x) => x.id === p.id)!.score--;
                              }),
                            )
                          }
                        >
                          <Minus size={17} />
                        </button>
                        <strong aria-label={`${p.name}: ${p.score} points`}>
                          {p.score}
                          <small>POINTS</small>
                        </strong>
                        <button
                          className="icon-button"
                          aria-label={`Add one point to ${p.name}`}
                          onClick={() =>
                            run(() =>
                              update((s) => {
                                s.players.find((x) => x.id === p.id)!.score++;
                              }),
                            )
                          }
                        >
                          <Plus size={17} />
                        </button>
                        <button
                          className="small-button"
                          aria-label={`Add five points to ${p.name}`}
                          onClick={() =>
                            run(() =>
                              update((s) => {
                                s.players.find((x) => x.id === p.id)!.score +=
                                  5;
                              }),
                            )
                          }
                        >
                          +5
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="page-actions">
                <button
                  className="secondary"
                  onClick={() => setModal({ type: "session" })}
                >
                  <Sparkles size={16} />
                  Manage session
                </button>
                {state.players.length > 0 && (
                  <button
                    className="text-button danger"
                    onClick={() =>
                      confirm(
                        "Reset everyone’s scores?",
                        "Players and round history stay saved. All scores will return to zero.",
                        async () => {
                          await update((s) => {
                            s.players.forEach((p) => (p.score = 0));
                          });
                        },
                      )
                    }
                  >
                    <RefreshCw size={15} />
                    Reset scores
                  </button>
                )}
              </div>
            </>
          )}
          {screen === "packs" && (
            <>
              <div className="packs-grid">
                {packs.map((pack) => (
                  <article className="pack-card panel" key={pack.id}>
                    <div className={`pack-art ${pack.color}`}>
                      <span>{pack.icon}</span>
                      <span className="pack-stamp">
                        GAMEHUB
                        <br />
                        GOOD TIMES CLUB
                      </span>
                      <i>✦</i>
                    </div>
                    <div className="pack-body">
                      <Pill>{pack.audience}</Pill>
                      <h2>{pack.name}</h2>
                      <p>{pack.description}</p>
                      <div className="pack-details">
                        <Layers size={15} />
                        {pack.count} Quick Stop categories
                      </div>
                      <button
                        className={
                          state.installed.includes(pack.id)
                            ? "secondary wide"
                            : "primary wide"
                        }
                        onClick={() =>
                          run(
                            () =>
                              update((s) => {
                                if (!s.installed.includes(pack.id))
                                  s.installed.push(pack.id);
                                s.settings.pack = pack.id;
                              }),
                            state.installed.includes(pack.id)
                              ? `${pack.audience} pack selected.`
                              : "Pack saved. Ready for your next round!",
                          )
                        }
                      >
                        {state.installed.includes(pack.id) ? (
                          <>
                            <Check size={16} />
                            Saved on this device
                          </>
                        ) : (
                          <>
                            <Download size={16} />
                            Save for offline
                          </>
                        )}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
              <section className="custom-panel panel">
                <div>
                  <span className="eyebrow">MAKE IT YOURS</span>
                  <h2>Your own little twist.</h2>
                  <p>
                    Add a Quick Stop category to every pack. Inside jokes
                    welcome.
                  </p>
                </div>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    run(
                      () =>
                        update((s) => {
                          const value = custom.trim();
                          if (!value) return;
                          if (s.custom.includes(value))
                            throw new Error("That category is already saved.");
                          s.custom.push(value);
                        }),
                      "Category added.",
                    ).then((ok) => {
                      if (ok) setCustom("");
                    });
                  }}
                >
                  <input
                    aria-label="Custom category"
                    placeholder="Things Dad says on holiday…"
                    value={custom}
                    maxLength={150}
                    required
                    onChange={(e) => setCustom(e.target.value)}
                  />
                  <button className="primary" type="submit">
                    <Plus size={17} />
                    Add category
                  </button>
                </form>
                {state.custom.length > 0 && (
                  <div className="custom-chips">
                    {state.custom.map((item) => (
                      <span key={item}>
                        {item}
                        <button
                          aria-label={`Remove category ${item}`}
                          onClick={() =>
                            run(() =>
                              update((s) => {
                                s.custom = s.custom.filter((c) => c !== item);
                              }),
                            )
                          }
                        >
                          <X size={13} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </section>
            </>
          )}
          {screen === "tools" && (
            <>
              <nav className="tool-shortcuts" aria-label="Jump to a game tool">
                {["Letter", "Dice", "Cards", "Number", "Timer"].map((label) => (
                  <button
                    key={label}
                    onClick={() =>
                      document
                        .getElementById(`tool-${label.toLowerCase()}`)
                        ?.scrollIntoView({
                          block: "start",
                          behavior: "instant",
                        })
                    }
                  >
                    {label}
                  </button>
                ))}
              </nav>
              <div className="tools-grid">
                <section id="tool-letter" className="tool panel">
                  <div className="tool-heading">
                    <span className="tool-icon lavender">
                      <span>A</span>
                    </span>
                    <div>
                      <h2>Pick a letter</h2>
                      <p>A starting point for a hundred games.</p>
                    </div>
                  </div>
                  <div className="tool-value letter-value">
                    {state.toolLetter}
                  </div>
                  <label className="toggle">
                    <input
                      type="checkbox"
                      checked={state.settings.easyLetters}
                      onChange={(e) =>
                        run(() =>
                          update((s) => {
                            s.settings.easyLetters = e.target.checked;
                          }),
                        )
                      }
                    />
                    Skip difficult letters (Q, X, Z)
                  </label>
                  <button
                    className="primary wide"
                    onClick={() =>
                      run(() =>
                        update((s) => {
                          s.toolLetter = pick(letters(s.settings.easyLetters));
                        }),
                      )
                    }
                  >
                    <Shuffle size={17} />
                    Generate letter
                  </button>
                </section>
                <section id="tool-dice" className="tool panel">
                  <div className="tool-heading">
                    <span className="tool-icon peach">
                      <Dices />
                    </span>
                    <div>
                      <h2>Roll the dice</h2>
                      <p>No chasing dice under the sofa.</p>
                    </div>
                  </div>
                  <div className="dice-tray">
                    {state.toolDice.map((value, i) => (
                      <DiceFace key={i} value={value} />
                    ))}
                  </div>
                  <label className="inline-field">
                    Number of dice
                    <select
                      aria-label="Number of dice"
                      value={state.toolDice.length}
                      onChange={(e) => {
                        const n = Number(e.target.value);
                        run(() =>
                          update((s) => {
                            s.toolDice = Array.from({ length: n }, () => 1);
                          }),
                        );
                      }}
                    >
                      <option value={1}>1 die</option>
                      <option value={2}>2 dice</option>
                      <option value={3}>3 dice</option>
                    </select>
                  </label>
                  <button
                    className="primary wide"
                    onClick={() =>
                      run(() =>
                        update((s) => {
                          s.toolDice = s.toolDice.map(() => randomInt(1, 6));
                        }),
                      )
                    }
                  >
                    <Dices size={18} />
                    Roll dice{" "}
                    {state.toolDice.length > 1 &&
                      `· Total ${state.toolDice.reduce((a, b) => a + b, 0)}`}
                  </button>
                </section>
                <section id="tool-cards" className="tool panel">
                  <div className="tool-heading">
                    <span className="tool-icon mint">♠</span>
                    <div>
                      <h2>Draw a card</h2>
                      <p>A full deck. No repeats until you reshuffle.</p>
                    </div>
                  </div>
                  <div className="card-tray">
                    <CardFace card={state.toolCard ?? undefined} />
                  </div>
                  <div className="tool-note">
                    {state.toolDeck.length} of 52 cards remaining · Aces are low
                  </div>
                  <div className="button-row">
                    <button
                      className="secondary"
                      onClick={() =>
                        run(
                          () =>
                            update((s) => {
                              s.toolDeck = newDeck();
                              s.toolCard = null;
                            }),
                          "Deck reshuffled.",
                        )
                      }
                    >
                      <RefreshCw size={16} />
                      Shuffle
                    </button>
                    <button
                      className="primary"
                      disabled={!state.toolDeck.length}
                      onClick={() =>
                        run(() =>
                          update((s) => {
                            s.toolCard = s.toolDeck.pop() ?? null;
                          }),
                        )
                      }
                    >
                      Draw card <ArrowRight size={16} />
                    </button>
                  </div>
                </section>
                <section id="tool-number" className="tool panel">
                  <div className="tool-heading">
                    <span className="tool-icon yellow">#</span>
                    <div>
                      <h2>Pick a number</h2>
                      <p>Leave the choosing up to chance.</p>
                    </div>
                  </div>
                  <div className="tool-value">{state.toolNumber ?? "?"}</div>
                  <div className="range-fields">
                    <label>
                      From
                      <input
                        type="number"
                        aria-label="Minimum number"
                        value={state.numberMin}
                        onChange={(e) => {
                          const n = Number(e.target.value);
                          run(() =>
                            update((s) => {
                              s.numberMin = n;
                            }),
                          );
                        }}
                      />
                    </label>
                    <span>to</span>
                    <label>
                      To
                      <input
                        type="number"
                        aria-label="Maximum number"
                        value={state.numberMax}
                        onChange={(e) => {
                          const n = Number(e.target.value);
                          run(() =>
                            update((s) => {
                              s.numberMax = n;
                            }),
                          );
                        }}
                      />
                    </label>
                  </div>
                  <button
                    className="primary wide"
                    onClick={() =>
                      run(() =>
                        update((s) => {
                          s.toolNumber = randomInt(s.numberMin, s.numberMax);
                        }),
                      )
                    }
                  >
                    <Shuffle size={17} />
                    Generate number
                  </button>
                </section>
                <section
                  id="tool-timer"
                  className="tool panel standalone-timer"
                >
                  <div className="tool-heading">
                    <span className="tool-icon peach">
                      <Timer />
                    </span>
                    <div>
                      <h2>Beat the clock</h2>
                      <p>A timer for whatever you’re playing.</p>
                    </div>
                  </div>
                  <div
                    className={`tool-value ${toolRemaining === 0 ? "danger" : ""}`}
                    role="timer"
                    aria-label={`${toolRemaining} seconds remaining`}
                  >
                    {String(Math.floor(toolRemaining / 60)).padStart(2, "0")}:
                    {String(toolRemaining % 60).padStart(2, "0")}
                  </div>
                  {toolRemaining === 0 && (
                    <p className="timer-done" role="status">
                      Time’s up!
                    </p>
                  )}
                  <div className="timer-presets">
                    {[30, 60, 120, 300].map((seconds) => (
                      <button
                        key={seconds}
                        className={
                          state.toolTimer.duration === seconds ? "chosen" : ""
                        }
                        onClick={() =>
                          run(() =>
                            update((s) => {
                              s.toolTimer = {
                                duration: seconds,
                                remaining: seconds,
                                deadline: null,
                              };
                            }),
                          )
                        }
                      >
                        {seconds < 60 ? `${seconds}s` : `${seconds / 60}m`}
                      </button>
                    ))}
                  </div>
                  <div className="button-row">
                    <button
                      className="secondary"
                      onClick={() =>
                        run(() =>
                          update((s) => {
                            s.toolTimer.remaining = s.toolTimer.duration;
                            s.toolTimer.deadline = null;
                          }),
                        )
                      }
                    >
                      <RefreshCw size={16} />
                      Reset
                    </button>
                    <button
                      className="primary"
                      onClick={() =>
                        run(() =>
                          update((s) => {
                            if (s.toolTimer.deadline) {
                              s.toolTimer.remaining = Math.max(
                                0,
                                (s.toolTimer.deadline - Date.now()) / 1000,
                              );
                              s.toolTimer.deadline = null;
                            } else {
                              if (s.toolTimer.remaining === 0)
                                s.toolTimer.remaining = s.toolTimer.duration;
                              s.toolTimer.deadline =
                                Date.now() + s.toolTimer.remaining * 1000;
                            }
                          }),
                        )
                      }
                    >
                      {state.toolTimer.deadline ? (
                        <Pause size={16} />
                      ) : (
                        <Play size={16} />
                      )}{" "}
                      {state.toolTimer.deadline ? "Pause" : "Start timer"}
                    </button>
                  </div>
                </section>
                <section className="tool-tip mint">
                  <Sparkles size={30} />
                  <h2>
                    One toolkit.
                    <br />
                    Endless possibilities.
                  </h2>
                  <p>
                    Make up your own games, settle who goes first, or roll your
                    way to a new holiday tradition.
                  </p>
                  <button className="text-button" onClick={() => go("scores")}>
                    Keep score as you go <ArrowRight size={17} />
                  </button>
                </section>
              </div>
            </>
          )}
          {screen === "play" &&
            (!round ? (
              <section className="empty-state panel">
                <Gamepad2 size={45} />
                <h2>Your next game is waiting.</h2>
                <p>Pick something fun and gather your crew.</p>
                <button className="primary" onClick={() => go("games")}>
                  Choose a game <ArrowRight size={18} />
                </button>
              </section>
            ) : (
              <div className="play-layout">
                <section
                  className={`play-board panel ${round.game === "quick-stop" ? "quick-board" : ""}`}
                >
                  <div className="round-top">
                    <Pill>
                      ROUND{" "}
                      {state.rounds
                        .filter((r) => r.sessionId === state.sessionId)
                        .findIndex((r) => r.id === round.id) + 1}
                    </Pill>
                    <span>
                      {round.pack === "adults"
                        ? "Adults · 18+"
                        : round.pack === "mixed"
                          ? "Mixed · includes adults"
                          : round.pack === "kids"
                            ? "Kids pack"
                            : "Family pack"}
                    </span>
                  </div>
                  {round.status === "finished" ? (
                    <div className="round-winner">
                      <span className="winner-art">
                        {state.players.find((p) => p.id === round.winner)
                          ?.avatar || "🏆"}
                      </span>
                      <span className="eyebrow">
                        {round.winner
                          ? round.game === "quick-stop"
                            ? "LAST ONE STANDING"
                            : "ROUND WINNER"
                          : "ROUND FINISHED"}
                      </span>
                      <h2>
                        {round.winner
                          ? `${state.players.find((p) => p.id === round.winner)?.name} wins!`
                          : "Well played, everyone."}
                      </h2>
                      <p>
                        {round.winner
                          ? "One point, a little glory and plenty of bragging rights."
                          : "Ready for another round?"}
                      </p>
                      {champion && (
                        <div className="champion-banner">
                          🏆 {champion.name} reached {state.settings.target}{" "}
                          points!
                        </div>
                      )}
                      <button
                        className="primary"
                        onClick={() =>
                          run(() =>
                            update((s) => {
                              startRound(s, round.game);
                            }),
                          ).then(() => setAnswer(""))
                        }
                      >
                        Next round <ArrowRight size={18} />
                      </button>
                      <button
                        className="text-button"
                        onClick={() => go("scores")}
                      >
                        See the scoreboard
                      </button>
                    </div>
                  ) : round.status === "cancelled" ? (
                    <div className="round-winner">
                      <Gamepad2 size={50} />
                      <h2>Round ended.</h2>
                      <p>No points were awarded for this round.</p>
                      <button
                        className="primary"
                        onClick={() => choose(round.game)}
                      >
                        Play again
                      </button>
                    </div>
                  ) : (
                    <>
                      {round.game === "quick-stop" ? (
                        <>
                          <div className="quick-result">
                            <span className="eyebrow">YOUR LETTER</span>
                            <div className="big-letter">{round.letter}</div>
                            <span className="eyebrow">YOUR CATEGORY</span>
                            <h2>{round.prompt}</h2>
                          </div>
                          <div className="turn-indicator">
                            <span className="avatar">{current?.avatar}</span>
                            <span>
                              <strong>{current?.name}, you’re up!</strong>
                              <small>
                                One answer. No repeats. Make it count.
                              </small>
                            </span>
                          </div>
                          {answerControls}
                          <form
                            className="answer-form"
                            onSubmit={(e) => {
                              e.preventDefault();
                              run(() =>
                                update((s) => {
                                  const r = activeRound(s)!;
                                  acceptAnswer(
                                    s,
                                    r,
                                    typedAnswers ? answer : "",
                                  );
                                }),
                              ).then((ok) => {
                                if (ok) setAnswer("");
                              });
                            }}
                          >
                            {typedAnswers && (
                              <div className="answer-entry">
                                <input
                                  value={answer}
                                  aria-label="Player answer"
                                  placeholder={`Answer beginning with ${round.letter}`}
                                  autoComplete="off"
                                  enterKeyHint="done"
                                  maxLength={100}
                                  required
                                  onChange={(e) => setAnswer(e.target.value)}
                                  disabled={!!round.challenge}
                                />
                              </div>
                            )}
                            <div className="turn-verdicts">
                              <button
                                className="turn-survived"
                                disabled={!!round.challenge}
                                type="submit"
                              >
                                <Check size={26} />
                                {typedAnswers ? "Valid answer" : "Survived"}
                              </button>
                              <button
                                className="turn-out"
                                disabled={!!round.challenge}
                                type="button"
                                onClick={() =>
                                  run(() =>
                                    update((s) => {
                                      const r = activeRound(s)!;
                                      eliminate(s, r, r.current);
                                    }),
                                  ).then((ok) => {
                                    if (ok) setAnswer("");
                                  })
                                }
                              >
                                <X size={26} /> Out
                              </button>
                            </div>
                          </form>
                          <p className="answer-hint">
                            {typedAnswers
                              ? "Record a valid answer, or tap ✕ if the player is out."
                              : "Say the answer aloud. ✓ keeps the player in; ✕ eliminates them. Both move to the next player."}
                          </p>
                          <div className="round-timer">
                            <div
                              className={`timer-ring ${remaining <= 2 ? "urgent" : ""}`}
                              style={
                                {
                                  "--progress": `${(remaining / round.duration) * 100}%`,
                                } as React.CSSProperties
                              }
                            >
                              <strong
                                role="timer"
                                aria-label={`${remaining} seconds remaining`}
                              >
                                {remaining}
                              </strong>
                              <small>SECONDS</small>
                            </div>
                            <div>
                              <button
                                className="secondary"
                                disabled={!!round.challenge}
                                onClick={() =>
                                  run(() =>
                                    update((s) => {
                                      toggleTimer(activeRound(s)!);
                                    }),
                                  )
                                }
                              >
                                {round.deadline ? (
                                  <Pause size={16} />
                                ) : (
                                  <Play size={16} />
                                )}{" "}
                                {round.deadline ? "Pause timer" : "Start turn"}
                              </button>
                            </div>
                          </div>
                          {state.settings.challenges &&
                            round.answers.length > 0 &&
                            !round.challenge && (
                              <button
                                className="challenge-button"
                                onClick={() => {
                                  setChallenger("");
                                  run(() =>
                                    update((s) => {
                                      pause(activeRound(s)!);
                                    }),
                                  );
                                  setModal({
                                    type: "confirm",
                                    title: "Quick Stop! Challenge an answer",
                                    body: "Choose who is challenging the previous answer. The group decides if it counts.",
                                  });
                                }}
                              >
                                <Zap size={17} />
                                Quick Stop! Challenge last answer
                              </button>
                            )}
                          {round.challenge && (
                            <div className="challenge-panel">
                              <strong>The group decides!</strong>
                              <p>
                                If the answer is invalid, the answerer is out.
                                If it counts, the challenger is out.
                              </p>
                              <div className="button-row">
                                <button
                                  className="secondary"
                                  onClick={() =>
                                    run(() =>
                                      update((s) => {
                                        resolveChallenge(
                                          s,
                                          activeRound(s)!,
                                          false,
                                        );
                                      }),
                                    )
                                  }
                                >
                                  Answer counts
                                </button>
                                <button
                                  className="primary"
                                  onClick={() =>
                                    run(() =>
                                      update((s) => {
                                        resolveChallenge(
                                          s,
                                          activeRound(s)!,
                                          true,
                                        );
                                      }),
                                    )
                                  }
                                >
                                  Answer is invalid
                                </button>
                              </div>
                            </div>
                          )}
                        </>
                      ) : round.game === "higher-lower" ? (
                        <div className="higher-lower-board">
                          <Pill>
                            {current?.avatar} {current?.name}’s turn
                          </Pill>
                          <div className="big-card-tray">
                            <CardFace card={round.card} />
                          </div>
                          <h2>Higher or lower?</h2>
                          <p>Aces are low. Matching ranks are a draw.</p>
                          <div className="button-row">
                            <button
                              className="primary"
                              onClick={() =>
                                run(() =>
                                  update((s) => {
                                    guessCard(s, activeRound(s)!, "lower");
                                  }),
                                )
                              }
                            >
                              ↓ Lower
                            </button>
                            <button
                              className="primary"
                              onClick={() =>
                                run(() =>
                                  update((s) => {
                                    guessCard(s, activeRound(s)!, "higher");
                                  }),
                                )
                              }
                            >
                              ↑ Higher
                            </button>
                          </div>
                          {round.result && (
                            <div className="card-result" role="status">
                              {round.result}
                            </div>
                          )}
                          <small>
                            {round.deck?.length} cards left in this deck
                          </small>
                        </div>
                      ) : (
                        <div className="prompt-board">
                          <Pill>
                            {current?.avatar} {current?.name}’s turn
                          </Pill>
                          <div className="prompt-symbol">
                            {round.game === "charades" ? "🎭" : "🕵️"}
                          </div>
                          <span className="eyebrow">
                            {round.game === "charades"
                              ? "ACT THIS OUT"
                              : "YOUR SECRET IDENTITY"}
                          </span>
                          <h2>
                            {round.revealed
                              ? round.prompt
                              : "For your eyes only."}
                          </h2>
                          <p>
                            {round.game === "charades"
                              ? "Only the actor should see the prompt. No talking or sounds!"
                              : "Show the identity to the group, then let the guesser ask yes/no questions."}
                          </p>
                          <button
                            className="secondary"
                            onClick={() =>
                              run(() =>
                                update((s) => {
                                  activeRound(s)!.revealed =
                                    !activeRound(s)!.revealed;
                                }),
                              )
                            }
                          >
                            {round.revealed ? "Hide prompt" : "Reveal prompt"}
                          </button>
                          <div
                            className="prompt-timer"
                            role="timer"
                            aria-label={`${remaining} seconds remaining`}
                          >
                            {remaining}
                            <small>
                              seconds {remaining === 0 ? "· Time’s up!" : ""}
                            </small>
                          </div>
                          <div className="button-row">
                            <button
                              className="secondary"
                              onClick={() =>
                                run(() =>
                                  update((s) => {
                                    toggleTimer(activeRound(s)!);
                                  }),
                                )
                              }
                            >
                              {round.deadline ? (
                                <Pause size={16} />
                              ) : (
                                <Play size={16} />
                              )}{" "}
                              {round.deadline ? "Pause" : "Start timer"}
                            </button>
                            <button
                              className="primary"
                              onClick={() =>
                                run(() =>
                                  update((s) => {
                                    award(
                                      s,
                                      activeRound(s)!,
                                      activeRound(s)!.current,
                                    );
                                  }),
                                )
                              }
                            >
                              Got it! +1 <Check size={16} />
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                  <div className="board-bottom">
                    <button className="text-button" onClick={() => go("games")}>
                      <ArrowLeft size={15} />
                      Back to games
                    </button>
                    {round.status === "active" && (
                      <button
                        className="text-button danger"
                        onClick={() =>
                          confirm(
                            "End this round?",
                            "This round will stay in your history. No extra points will be awarded.",
                            async () => {
                              await update((s) => {
                                const r = activeRound(s)!;
                                r.status = "cancelled";
                                r.deadline = null;
                              });
                            },
                          )
                        }
                      >
                        End round
                      </button>
                    )}
                  </div>
                </section>
                <aside className="play-side">
                  <section className="panel">
                    <div className="section-title">
                      <h2>The players</h2>
                      <Trophy size={19} />
                    </div>
                    <div className="round-players">
                      {state.players.map((p) => (
                        <div
                          key={p.id}
                          className={`${round.current === p.id && round.status === "active" ? "current" : ""} ${!round.active.includes(p.id) ? "eliminated" : ""}`}
                        >
                          <span className="avatar">{p.avatar}</span>
                          <div>
                            <strong>{p.name}</strong>
                            <small>
                              {!round.players.includes(p.id)
                                ? "Not in this round"
                                : !round.active.includes(p.id)
                                  ? "Out this round"
                                  : round.winner === p.id
                                    ? "Round winner"
                                    : round.current === p.id &&
                                        round.status === "active"
                                      ? "Your turn"
                                      : "In the game"}
                            </small>
                          </div>
                          <span className="player-points">
                            {p.score}
                            <small>pts</small>
                          </span>
                        </div>
                      ))}
                    </div>
                    <button
                      className="text-button wide"
                      onClick={() => go("scores")}
                    >
                      Full scoreboard <ArrowRight size={15} />
                    </button>
                  </section>
                  {round.game === "quick-stop" && (
                    <section className="panel answer-history">
                      <h2>Already said</h2>
                      <p className="muted">No repeats in this round.</p>
                      {round.answers.length ? (
                        <ol>
                          {round.answers.map((a, i) => (
                            <li key={i}>
                              <span>{a.text}</span>
                              <small>
                                {
                                  state.players.find((p) => p.id === a.player)
                                    ?.name
                                }
                              </small>
                            </li>
                          ))}
                        </ol>
                      ) : (
                        <div className="small-empty">
                          The first answer is up for grabs.
                        </div>
                      )}
                    </section>
                  )}
                  <div className="play-note">
                    <Info size={17} />
                    <p>
                      {round.game === "quick-stop"
                        ? "The last player standing earns 1 point. The group decides whether an answer fits."
                        : "Use the shared scoreboard to award points for your own house rules."}
                    </p>
                  </div>
                </aside>
              </div>
            ))}
          {screen === "history" && (
            <>
              <div className="history-stats">
                <div className="panel">
                  <History />
                  <strong>{state.rounds.length}</strong>
                  <span>Rounds played</span>
                </div>
                <div className="panel">
                  <Users />
                  <strong>{state.players.length}</strong>
                  <span>In the crew</span>
                </div>
                <div className="panel">
                  <Sparkles />
                  <strong>{state.sessions.length}</strong>
                  <span>Sessions together</span>
                </div>
              </div>
              {state.rounds.length === 0 ? (
                <section className="empty-state panel">
                  <span className="empty-emoji">📸</span>
                  <h2>The best memories are still to come.</h2>
                  <p>Play your first round. We’ll keep the good bits here.</p>
                  <button className="primary" onClick={() => go("games")}>
                    Make a memory <ArrowRight size={17} />
                  </button>
                </section>
              ) : (
                <div className="history-list">
                  {[...state.sessions].reverse().map((s) => (
                    <section className="panel" key={s.id}>
                      <div className="section-title">
                        <div>
                          <h2>{s.name}</h2>
                          <p className="muted">
                            {new Date(s.startedAt).toLocaleDateString("en-GB", {
                              day: "numeric",
                              month: "long",
                              year: "numeric",
                            })}
                          </p>
                        </div>
                        <Pill>{s.endedAt ? "Finished" : "In progress"}</Pill>
                      </div>
                      {s.scores && (
                        <p className="session-summary">
                          {[...s.scores]
                            .sort((a, b) => b.score - a.score)
                            .map((p) => `${p.avatar} ${p.name}: ${p.score}`)
                            .join(" · ")}
                        </p>
                      )}
                      {[...state.rounds]
                        .filter((r) => r.sessionId === s.id)
                        .reverse()
                        .map((r) => (
                          <div className="history-row" key={r.id}>
                            <span
                              className={`history-icon ${games.find((g) => g.id === r.game)?.color}`}
                            >
                              {games.find((g) => g.id === r.game)?.icon}
                            </span>
                            <div>
                              <strong>
                                {games.find((g) => g.id === r.game)?.name}
                              </strong>
                              <p>
                                {r.game === "quick-stop"
                                  ? `${r.letter} · `
                                  : ""}
                                {r.prompt}
                              </p>
                            </div>
                            <div className="history-result">
                              <strong>
                                {r.winner
                                  ? `${r.playerNames?.[r.winner] ?? state.players.find((p) => p.id === r.winner)?.name ?? "Player"} +1`
                                  : r.status === "cancelled"
                                    ? "Ended"
                                    : r.status === "active"
                                      ? "In progress"
                                      : "Finished"}
                              </strong>
                              <small>
                                {new Date(r.createdAt).toLocaleTimeString(
                                  "en-GB",
                                  { hour: "2-digit", minute: "2-digit" },
                                )}
                              </small>
                            </div>
                          </div>
                        ))}
                    </section>
                  ))}
                </div>
              )}
            </>
          )}
          {screen === "settings" && (
            <div className="settings-grid">
              <section className="panel settings-panel">
                <span className="setting-symbol mint">
                  <WifiOff />
                </span>
                <h2>Ready for take-off.</h2>
                <p>
                  Open GameHub before you travel. Once the app is cached, your
                  games, packs and scores work in airplane mode.
                </p>
                <div className="readiness-list">
                  <div>
                    <Check size={18} />
                    Players and scores saved on this device
                  </div>
                  <div>
                    <Check size={18} />
                    {state.installed.length} game packs saved
                  </div>
                  <div>
                    {ready || offlineReady ? (
                      <Check size={18} />
                    ) : (
                      <RefreshCw size={18} />
                    )}{" "}
                    {ready || offlineReady
                      ? "App cached for offline play"
                      : "App caching in progress"}
                  </div>
                </div>
                {install ? (
                  <button
                    className="primary wide"
                    onClick={() =>
                      run(async () => {
                        await install.prompt();
                        const result = await install.userChoice;
                        if (result.outcome === "accepted") setInstall(null);
                      })
                    }
                  >
                    <Download size={18} />
                    Install GameHub
                  </button>
                ) : (
                  <div className="install-help">
                    <strong>Add GameHub to your home screen</strong>
                    <p>
                      iPhone: open in Safari, tap Share, then Add to Home
                      Screen.
                      <br />
                      Android: open your browser menu and choose Install app.
                    </p>
                  </div>
                )}
                {needsRefresh && (
                  <button
                    className="secondary wide"
                    onClick={() => run(() => updateServiceWorker(true))}
                  >
                    A fresh version is ready · Update app
                  </button>
                )}
              </section>
              <section className="panel settings-panel">
                <span className="setting-symbol lavender">
                  <Cloud />
                </span>
                <h2>A little peace of mind.</h2>
                <p>
                  Export a backup to keep your holiday scores safe, or restore
                  one on another device.
                </p>
                <div className="button-row">
                  <button className="primary" onClick={saveFile}>
                    <Download size={16} />
                    Export backup
                  </button>
                  <button
                    className="secondary"
                    onClick={() => fileRef.current?.click()}
                  >
                    Import backup
                  </button>
                </div>
                <input
                  type="file"
                  hidden
                  accept="application/json,.json"
                  ref={fileRef}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) loadFile(file);
                    e.target.value = "";
                  }}
                />
                <hr />
                <h3>Optional cloud backup</h3>
                {!cloud ? (
                  <p className="muted">
                    Cloud backup isn’t connected yet. You can play every game
                    and save your progress on this device without an account.
                  </p>
                ) : user ? (
                  <>
                    <p className="muted">Signed in as {user}</p>
                    <p role="status">
                      {!online
                        ? "Waiting for a connection. Scores are safe on this device."
                        : syncStatus ||
                          "Scores and game progress back up automatically when connected."}
                    </p>
                    <div className="button-row">
                      <button
                        className="secondary"
                        disabled={busy || !online}
                        onClick={async () => {
                          setBusy(true);
                          await run(backup, "Cloud backup saved.");
                          setBusy(false);
                        }}
                      >
                        Back up now
                      </button>
                      <button
                        className="text-button"
                        onClick={() =>
                          run(() =>
                            cloud!.auth.signOut().then(({ error }) => {
                              if (error) throw error;
                            }),
                          )
                        }
                      >
                        Sign out
                      </button>
                    </div>
                    <button
                      className="text-button"
                      onClick={() =>
                        run(async () => setCloudBackups(await listBackups()))
                      }
                    >
                      View saved cloud backups <ArrowRight size={16} />
                    </button>
                    {cloudBackups.map((item) => (
                      <button
                        className="cloud-backup-row"
                        key={item.id}
                        onClick={() =>
                          confirm(
                            "Restore cloud backup?",
                            "This will replace your local game data. Export a backup first to keep your current progress.",
                            async () => {
                              await restore(item.id);
                              notify("Cloud backup restored.");
                            },
                          )
                        }
                      >
                        {item.device_name} ·{" "}
                        {new Date(item.updated_at).toLocaleDateString()}
                        <Download size={16} />
                      </button>
                    ))}
                  </>
                ) : (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      run(async () => {
                        const { error } = await cloud!.auth.signInWithOtp({
                          email,
                          options: { emailRedirectTo: location.origin },
                        });
                        if (error) throw error;
                      }, "Check your email for a sign-in link.");
                    }}
                  >
                    <label>
                      Email address
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                      />
                    </label>
                    <button className="primary" disabled={!online}>
                      Email a sign-in link <ArrowRight size={16} />
                    </button>
                  </form>
                )}
              </section>
              <section className="panel settings-panel game-settings">
                <h2>Your house rules.</h2>
                <p>Set the pace for your next Quick Stop round.</p>
                <label className="setting-row">
                  Seconds per turn
                  <select
                    value={state.settings.turnSeconds}
                    onChange={(e) => {
                      const value = Number(e.target.value);
                      run(() =>
                        update((s) => {
                          s.settings.turnSeconds = value;
                        }),
                      );
                    }}
                  >
                    {[5, 10, 15, 30].map((v) => (
                      <option value={v} key={v}>
                        {v} seconds
                      </option>
                    ))}
                  </select>
                </label>
                <label className="setting-row">
                  Winning score
                  <select
                    value={state.settings.target}
                    onChange={(e) => {
                      const value = Number(e.target.value);
                      run(() =>
                        update((s) => {
                          s.settings.target = value;
                        }),
                      );
                    }}
                  >
                    <option value={10}>First to 10</option>
                    <option value={20}>First to 20</option>
                    <option value={0}>Keep playing</option>
                  </select>
                </label>
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={state.settings.easyLetters}
                    onChange={(e) =>
                      run(() =>
                        update((s) => {
                          s.settings.easyLetters = e.target.checked;
                        }),
                      )
                    }
                  />
                  Skip difficult letters (Q, X, Z)
                </label>
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={state.settings.challenges}
                    onChange={(e) =>
                      run(() =>
                        update((s) => {
                          s.settings.challenges = e.target.checked;
                        }),
                      )
                    }
                  />
                  Allow Quick Stop challenges
                </label>
              </section>
              <section className="settings-about peach">
                <span>🎲</span>
                <h2>
                  Good times,
                  <br />
                  anywhere.
                </h2>
                <p>
                  Made for slow afternoons, long journeys and the people you
                  love spending them with.
                </p>
                <small>GameHub · Version 1.0</small>
              </section>
            </div>
          )}
          <footer className="footer">
            <span>
              GameHub. <span>A little fun goes a long way.</span>
            </span>
            <span>
              <span className="green-dot" />{" "}
              {online ? "Saved locally, always." : "Offline. Still good times."}
            </span>
          </footer>
        </main>
      </div>
      <nav
        className="mobile-tabs"
        aria-label="Quick navigation"
        inert={menu || !!modal}
      >
        {nav.slice(0, 4).map((item) => (
          <button
            key={item.id}
            aria-current={
              screen === item.id ||
              (item.id === "games" && screen === "play") ||
                (item.id === "games" &&
                  (["would-you-rather", "hangman", "trivia", "rock-paper-scissors", "noughts-crosses"] as Screen[]).includes(screen))
                ? "page"
                : undefined
            }
            onClick={() => go(item.id)}
          >
            <item.icon size={22} />
            <span>
              {item.id === "home"
                ? "Home"
                : item.id === "games"
                  ? "Games"
                  : item.id === "tools"
                    ? "Tools"
                    : "Scores"}
            </span>
          </button>
        ))}
        <button
          aria-label="More navigation options"
          aria-expanded={menu}
          aria-controls="app-navigation"
          aria-current={
            ["packs", "history", "settings", "eli", "immy", "uno"].includes(screen)
              ? "page"
              : undefined
          }
          onClick={() => setMenu(true)}
        >
          <Menu size={22} />
          <span>More</span>
        </button>
      </nav>
      {modal && (
        <ModalShell
          title={
            modal.title ??
            {
              players: "Gather your crew",
              setup: "Let’s set up a little fun",
              rules: "How to play",
              session: "Your game night",
              confirm: "Are you sure?",
            }[modal.type]
          }
          close={closeModal}
        >
          {modal.type === "players" && (
            <>
              <p className="muted">
                Your family players stay ready for every game. Choose a player,
                then pick their logo.
              </p>
              <div className="player-logo-tabs" aria-label="Choose a player">
                {state.players.map((p) => (
                  <button
                    type="button"
                    key={p.id}
                    className={logoPlayer?.id === p.id ? "chosen" : ""}
                    aria-pressed={logoPlayer?.id === p.id}
                    onClick={() => setEditingPlayer(p.id)}
                  >
                    <span>{p.avatar}</span>{p.name}
                  </button>
                ))}
              </div>
              {logoPlayer && (
                <>
                  <label className="logo-picker-label">
                    Pick {logoPlayer.name}’s logo
                  </label>
                  <div className="avatar-picker">
                    {avatars.map((nextAvatar) => (
                      <button
                        type="button"
                        aria-label={`Use ${nextAvatar} for ${logoPlayer.name}`}
                        aria-pressed={logoPlayer.avatar === nextAvatar}
                        key={nextAvatar}
                        className={logoPlayer.avatar === nextAvatar ? "chosen" : ""}
                        onClick={() =>
                          run(
                            () =>
                              update((s) => {
                                const player = s.players.find(
                                  (item) => item.id === logoPlayer.id,
                                );
                                if (player) player.avatar = nextAvatar;
                              }),
                            `${logoPlayer.name}’s logo updated.`,
                          )
                        }
                      >
                        {nextAvatar}
                      </button>
                    ))}
                  </div>
                </>
              )}
              <button
                className="secondary wide"
                onClick={() => {
                  closeModal();
                  go("games");
                }}
              >
                All here. Let’s play <ArrowRight size={16} />
              </button>
            </>
          )}
          {modal.type === "setup" && (
            <>
              <div
                className={`setup-game ${games.find((g) => g.id === modal.game)?.color}`}
              >
                <span>{games.find((g) => g.id === modal.game)?.icon}</span>
                <div>
                  <h3>{games.find((g) => g.id === modal.game)?.name}</h3>
                  <p>{games.find((g) => g.id === modal.game)?.description}</p>
                </div>
              </div>
              {state.players.length <
              (modal.game === "higher-lower" ? 1 : 2) ? (
                <div className="setup-warning">
                  <Users size={20} />
                  <p>
                    Add{" "}
                    {modal.game === "higher-lower"
                      ? "at least one player"
                      : "at least two players"}{" "}
                    to get started.
                  </p>
                  <button
                    className="primary wide"
                    onClick={() => setModal({ type: "players" })}
                  >
                    <Plus size={17} />
                    Add your crew
                  </button>
                </div>
              ) : (
                <>
                  <div className="setup-avatars">
                    {state.players.map((p) => (
                      <span key={p.id}>
                        {p.avatar} {p.name}
                      </span>
                    ))}
                  </div>
                  {modal.game === "quick-stop" && (
                    <>
                      {answerControls}
                      <label>
                        Choose your category pack
                        <select
                          value={state.settings.pack}
                          onChange={(e) => {
                            const value = e.target.value as PackId;
                            run(() =>
                              update((s) => {
                                s.settings.pack = value;
                              }),
                            );
                          }}
                        >
                          {packs
                            .filter((p) => state.installed.includes(p.id))
                            .map((p) => (
                              <option value={p.id} key={p.id}>
                                {p.audience} · {p.count} categories
                              </option>
                            ))}
                          {state.installed.includes("adults") && (
                            <option value="mixed">
                              Mixed · includes adult categories
                            </option>
                          )}
                        </select>
                      </label>
                      {(state.settings.pack === "adults" ||
                        state.settings.pack === "mixed") && (
                        <p className="adult-note">
                          18+ categories include dating, alcohol and cheeky
                          adult topics.
                        </p>
                      )}
                      <div className="setup-two">
                        <label>
                          Turn timer
                          <select
                            value={state.settings.turnSeconds}
                            onChange={(e) => {
                              const n = Number(e.target.value);
                              run(() =>
                                update((s) => {
                                  s.settings.turnSeconds = n;
                                }),
                              );
                            }}
                          >
                            {[5, 10, 15, 30].map((v) => (
                              <option key={v} value={v}>
                                {v} seconds
                              </option>
                            ))}
                          </select>
                        </label>
                        <label>
                          Winning score
                          <select
                            value={state.settings.target}
                            onChange={(e) => {
                              const n = Number(e.target.value);
                              run(() =>
                                update((s) => {
                                  s.settings.target = n;
                                }),
                              );
                            }}
                          >
                            <option value={10}>First to 10</option>
                            <option value={20}>First to 20</option>
                            <option value={0}>Keep playing</option>
                          </select>
                        </label>
                      </div>
                      <label className="toggle">
                        <input
                          type="checkbox"
                          checked={state.settings.easyLetters}
                          onChange={(e) =>
                            run(() =>
                              update((s) => {
                                s.settings.easyLetters = e.target.checked;
                              }),
                            )
                          }
                        />
                        Skip Q, X and Z
                      </label>
                      <p className="muted">
                        {
                          categoriesFor(state.settings.pack, state.custom)
                            .length
                        }{" "}
                        categories ready. More packs in Game packs.
                      </p>
                    </>
                  )}
                  {session?.endedAt ? (
                    <button
                      className="primary wide"
                      onClick={() => setModal({ type: "session" })}
                    >
                      Start a new session
                    </button>
                  ) : (
                    <button
                      className="primary wide"
                      onClick={() => {
                        const game = modal.game!;
                        run(() =>
                          update((s) => {
                            startRound(s, game);
                          }),
                        ).then((ok) => {
                          if (ok) {
                            setAnswer("");
                            closeModal();
                            go("play");
                          }
                        });
                      }}
                    >
                      Start playing <Play size={17} />
                    </button>
                  )}
                  <button
                    className="text-button wide"
                    onClick={() =>
                      setModal({ type: "rules", game: modal.game })
                    }
                  >
                    <Info size={16} />
                    How to play
                  </button>
                </>
              )}
            </>
          )}
          {modal.type === "rules" && (
            <div className="rules">
              <div className="rules-icon">
                {games.find((g) => g.id === modal.game)?.icon || "⚡"}
              </div>
              <h3>
                {games.find((g) => g.id === modal.game)?.name || "Quick Stop"}
              </h3>
              {modal.game === "charades" ? (
                <ol>
                  <li>Only the actor looks at the secret prompt.</li>
                  <li>
                    Start the 60-second timer. Act without words or sounds.
                  </li>
                  <li>
                    The group guesses. If someone gets it, tap Got it to award
                    the actor 1 point.
                  </li>
                  <li>
                    If time runs out, end the round without a point. Rotate
                    actors each round.
                  </li>
                </ol>
              ) : modal.game === "who-am-i" ? (
                <ol>
                  <li>
                    One player is the guesser. Someone else reveals the identity
                    to the group without showing the guesser.
                  </li>
                  <li>
                    The guesser asks yes/no questions for up to 60 seconds.
                  </li>
                  <li>
                    A correct guess earns the guesser 1 point. If time runs out,
                    end the round.
                  </li>
                  <li>Rotate the guesser each round.</li>
                </ol>
              ) : modal.game === "higher-lower" ? (
                <ol>
                  <li>
                    Look at the face-up card and guess whether the next card is
                    higher or lower.
                  </li>
                  <li>
                    A correct guess earns 1 point. Incorrect guesses and ties
                    earn no points.
                  </li>
                  <li>
                    Aces are low; J, Q, K are 11, 12, 13. Suits don’t affect
                    rank.
                  </li>
                  <li>
                    Take turns after every guess. Cards don’t repeat until the
                    deck runs out.
                  </li>
                </ol>
              ) : (
                <>
                  <ol>
                    <li>
                      One letter + one category. Give an answer beginning with
                      that letter.
                    </li>
                    <li>
                      Go around the crew. Each player has{" "}
                      {state.settings.turnSeconds} seconds to answer. Tap Valid
                      answer to pass the turn.
                    </li>
                    <li>
                      No repeats. Wrong answers, repeats and timeouts mean
                      you’re out of that round.
                    </li>
                    <li>
                      Last player standing earns 1 point.{" "}
                      {state.settings.target
                        ? `First to ${state.settings.target} is the holiday champion!`
                        : "Keep playing for an overall holiday scoreboard."}
                    </li>
                  </ol>
                  <div className="rule-tip">
                    <Zap size={19} />
                    <p>
                      Quick Stop! Challenge the previous answer. The group
                      votes: if the answer is invalid, the answerer is out. If
                      it counts, the challenger is out.
                    </p>
                  </div>
                </>
              )}
              <button className="primary wide" onClick={closeModal}>
                Got it <Check size={16} />
              </button>
            </div>
          )}
          {modal.type === "session" && (
            <>
              <Pill>{session?.endedAt ? "Finished" : "Current session"}</Pill>
              <h3 className="session-name">{session?.name}</h3>
              <p className="muted">
                {
                  state.rounds.filter((r) => r.sessionId === state.sessionId)
                    .length
                }{" "}
                rounds played together.
              </p>
              {!session?.endedAt && (
                <button
                  className="secondary wide"
                  onClick={() =>
                    confirm(
                      "Finish this session?",
                      "We’ll save the final scoreboard and end any active round. Your players stay ready for the next game night.",
                      async () => {
                        await update(finishSession);
                        notify("Session saved in Our memories.");
                      },
                    )
                  }
                >
                  <Check size={17} />
                  Finish session
                </button>
              )}
              <hr />
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  run(
                    () =>
                      update((s) => {
                        newSession(s, sessionName, resetSession);
                      }),
                    "A new game night begins.",
                  ).then((ok) => {
                    if (ok) {
                      closeModal();
                      go("home");
                    }
                  });
                }}
              >
                <label>
                  Start a new session
                  <input
                    value={sessionName}
                    maxLength={60}
                    required
                    onChange={(e) => setSessionName(e.target.value)}
                    placeholder="Majorca, summer 2026"
                  />
                </label>
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={resetSession}
                    onChange={(e) => setResetSession(e.target.checked)}
                  />
                  Start with fresh scores
                </label>
                <button className="primary wide" type="submit">
                  New game night <Sparkles size={17} />
                </button>
              </form>
            </>
          )}
          {modal.type === "confirm" && (
            <>
              <p className="muted">{modal.body}</p>
              {modal.title === "Quick Stop! Challenge an answer" ? (
                <>
                  <label>
                    Who is challenging?
                    <select
                      value={challenger}
                      onChange={(e) => setChallenger(e.target.value)}
                    >
                      <option value="">Choose a player</option>
                      {state.players
                        .filter(
                          (p) =>
                            round?.active.includes(p.id) &&
                            p.id !== round.answers.at(-1)?.player,
                        )
                        .map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                    </select>
                  </label>
                  <button
                    className="primary wide"
                    disabled={!challenger}
                    onClick={() =>
                      run(() =>
                        update((s) => {
                          const r = activeRound(s)!;
                          pause(r);
                          r.challenge = {
                            previous: r.answers.at(-1)!.player,
                            challenger,
                          };
                        }),
                      ).then((ok) => {
                        if (ok) closeModal();
                      })
                    }
                  >
                    <Zap size={16} />
                    Let the group decide
                  </button>
                </>
              ) : (
                <div className="button-row">
                  <button className="secondary" onClick={closeModal}>
                    Keep as it is
                  </button>
                  <button
                    className="primary"
                    onClick={() => {
                      if (modal.action)
                        run(modal.action).then((ok) => {
                          if (ok) closeModal();
                        });
                    }}
                  >
                    Confirm <Check size={16} />
                  </button>
                </div>
              )}
            </>
          )}
        </ModalShell>
      )}
      {toast && (
        <div className="toast" role="status">
          <Info size={18} />
          <span>{toast}</span>
          <button
            aria-label="Dismiss notification"
            onClick={() => setToast("")}
          >
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
