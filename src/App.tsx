import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import GameStage from "./components/GameStage";
import { RootState } from "./app/store";
import {
  setBet,
  setBetStep,
  setAutoplayCount,
  setSpeed,
  stopAutoplay,
  startGame,
} from "./features/game/gameSlice";
import { triggerHaptic } from "./shared/lib/telegram";
import tonSvg from "./assets/ton.svg";

const STAGE_WIDTH = 920;

const TonIcon = () => <img src={tonSvg} alt="" className="currency-icon" />;

const setStageScale = () => {
  const w = document.documentElement.clientWidth || window.innerWidth;
  document.documentElement.style.setProperty("--stage-scale", String(w / STAGE_WIDTH));
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const randomBetween = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

export default function App() {
  const dispatch = useDispatch();
  const [autoplayOpen, setAutoplayOpen] = useState(false);
  const {
    bet,
    betStep,
    balance,
    currentWin,
    status,
    speed,
    lastOutcome,
    lastWin,
    autoplayCount,
    autoplayRemaining,
    demoMode,
  } = useSelector((state: RootState) => state.game);

  const [showBigWin, setShowBigWin] = useState(false);
  const [flyWin, setFlyWin] = useState(false);
  const [winAmount, setWinAmount] = useState(0);
  const winTimerRef = useRef<number | null>(null);
  const prevOutcomeRef = useRef(lastOutcome);

  useEffect(() => {
    setStageScale();
    window.addEventListener("resize", setStageScale);
    return () => window.removeEventListener("resize", setStageScale);
  }, []);

  const canPlay = status === "idle" && (demoMode || balance >= bet);

  const handlePlay = () => {
    const flightDurationMs = randomBetween(6500, 10500);
    const landingTarget = Math.random() < 0.18 ? "water" : "ship";
    dispatch(startGame({ flightDurationMs, landingTarget }));
  };

  const betSteps = [1, 5, 10, 20, 50];
  const autoplayOptions = [3, 5, 10, 20, 50];

  useEffect(() => {
    if (prevOutcomeRef.current !== lastOutcome && lastOutcome) {
      const isBigWin = lastWin >= bet * 3;
      setWinAmount(lastWin);
      if (lastOutcome === "shipWin") triggerHaptic(isBigWin ? "success" : "impact");
      if (lastOutcome === "water" || lastOutcome === "shipLose") triggerHaptic("warning");

      if (winTimerRef.current) {
        window.clearTimeout(winTimerRef.current);
      }

      if (isBigWin) {
        setShowBigWin(true);
        setFlyWin(false);
        winTimerRef.current = window.setTimeout(() => {
          setShowBigWin(false);
        }, 2200);
      } else {
        setFlyWin(true);
        setShowBigWin(false);
        winTimerRef.current = window.setTimeout(() => {
          setFlyWin(false);
        }, 1100);
      }
    }

    prevOutcomeRef.current = lastOutcome;

    return () => {
      if (winTimerRef.current) {
        window.clearTimeout(winTimerRef.current);
      }
    };
  }, [lastOutcome, lastWin, bet]);

  return (
    <div className="app">
      {/* Заглушка хедера — удалить при подключении реального хедера */}
      <header className="header-stub" aria-hidden="true">
        <span className="header-stub-badge">Заглушка — удалить при подключении реального хедера</span>
        <div className="header-stub-status">
          <span className="header-stub-time">9:41</span>
          <span className="header-stub-icons">
            <span className="header-stub-icon" aria-hidden>▮▮▮</span>
            <span className="header-stub-icon" aria-hidden>⌂</span>
            <span className="header-stub-icon header-stub-battery" aria-hidden>▭</span>
          </span>
        </div>
        <div className="header-stub-notch" />
        <div className="header-stub-main">
          <button type="button" className="header-stub-back">
            ‹ Back
          </button>
          <div className="header-stub-title-wrap">
            <h1 className="header-stub-title">CHANCE</h1>
            <span className="header-stub-subtitle">bot</span>
          </div>
          <button type="button" className="header-stub-menu" aria-label="Меню">
            ⋯
          </button>
        </div>
      </header>

      <GameStage />

      <section className="controls">
        <div className="speed-row">
          <button
            type="button"
            className={`speed-tab ${speed === "normal" ? "speed-tab--active" : ""}`}
            onClick={() => dispatch(setSpeed("normal"))}
          >
            Normal
          </button>
          <button
            type="button"
            className={`speed-tab ${speed === "fast" ? "speed-tab--active" : ""}`}
            onClick={() => dispatch(setSpeed("fast"))}
          >
            Fast
          </button>
        </div>

        <div className="bet-controls">
          <button
            type="button"
            className="bet-btn"
            onClick={() => dispatch(setBet(clamp(bet - betStep, 1, 200)))}
            disabled={status !== "idle"}
          >
            −
          </button>
          <span className="bet-display">{bet.toFixed(2)} <TonIcon /></span>
          <button
            type="button"
            className="bet-btn"
            onClick={() => dispatch(setBet(clamp(bet + betStep, 1, 200)))}
            disabled={status !== "idle"}
          >
            +
          </button>
        </div>

        <div className="step-controls">
          {betSteps.map((step) => (
            <button
              key={step}
              type="button"
              className={`step-chip ${betStep === step ? "step-chip--active" : ""}`}
              onClick={() => dispatch(setBetStep(step))}
              disabled={status !== "idle"}
            >
              {step} <TonIcon />
            </button>
          ))}
        </div>

        <div className={`autoplay-bar ${autoplayOpen ? "autoplay-bar--open" : ""}`}>
          <button
            type="button"
            className="autoplay-bar-toggle"
            onClick={() => setAutoplayOpen((v) => !v)}
          >
            <span className="autoplay-bar-label">Autoplay</span>
            <span className="autoplay-bar-icons">
              <svg className="autoplay-bar-refresh" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                <path fill="currentColor" d="M17.65 6.35A7.958 7.958 0 0 0 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0 1 12 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z" />
              </svg>
              <svg className="autoplay-bar-chevron" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
                <path fill="currentColor" d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z" />
              </svg>
            </span>
          </button>
          {autoplayOpen ? (
            <div className="autoplay-panel">
              {autoplayRemaining > 0 ? (
                <button type="button" className="autoplay-stop" onClick={() => dispatch(stopAutoplay())}>
                  Stop
                </button>
              ) : null}
              {autoplayOptions.map((count) => (
                <button
                  key={count}
                  type="button"
                  className={`autoplay-option ${autoplayCount === count ? "autoplay-option--active" : ""}`}
                  onClick={() => dispatch(setAutoplayCount(count))}
                  disabled={status !== "idle"}
                >
                  {count}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <button type="button" className="play" onClick={handlePlay} disabled={!canPlay}>
          {status === "idle" ? "Play" : "In Flight"}
        </button>
      </section>

      {lastOutcome ? (
        <div className={`outcome outcome-${lastOutcome}`}>
          Last outcome: {lastOutcome}
        </div>
      ) : null}

      {showBigWin ? (
        <div className="big-win">
          <div className="big-win-card">
            <div className="big-win-label">Big win</div>
            <div className="big-win-value">{winAmount.toFixed(2)} <TonIcon /></div>
          </div>
        </div>
      ) : null}

      {flyWin ? (
        <div className="win-fly">
          <span className="win-fly-token">+{winAmount.toFixed(2)} <TonIcon /></span>
        </div>
      ) : null}
    </div>
  );
}
