import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import GameStage from "./components/GameStage";
import { RootState } from "./app/store";
import {
  setBet,
  setBetStep,
  setAutoplayCount,
  setDemoMode,
  setSpeed,
  stopAutoplay,
  startGame,
} from "./features/game/gameSlice";

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

  const canPlay = status === "idle" && (demoMode || balance >= bet);

  const handlePlay = () => {
    const flightDurationMs = randomBetween(6500, 10500);
    const landingTarget = Math.random() < 0.18 ? "water" : "ship";
    dispatch(startGame({ flightDurationMs, landingTarget }));
  };

  const betSteps = [1, 2, 5, 10, 20];
  const autoplayOptions = [3, 5, 10, 20, 50];

  useEffect(() => {
    if (prevOutcomeRef.current !== lastOutcome && lastOutcome) {
      const isBigWin = lastWin >= bet * 3;
      setWinAmount(lastWin);

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
      <header className="top-bar">
        <div className="stat">
          <div className="stat-label">Balance</div>
          <div className="stat-value">{balance.toFixed(2)} TON</div>
        </div>
        <div className="stat">
          <div className="stat-label">Bet</div>
          <div className="stat-value">{bet.toFixed(2)} TON</div>
        </div>
        <div className="stat">
          <div className="stat-label">Current</div>
          <div className="stat-value">{currentWin.toFixed(2)} TON</div>
        </div>
      </header>

      <GameStage />

      <section className="controls">
        <div className="control-panel">
          <div className="bet-controls">
            <button
              type="button"
              onClick={() => dispatch(setBet(clamp(bet - betStep, 1, 200)))}
              disabled={status !== "idle"}
            >
              -
            </button>
            <span className="bet-display">{bet.toFixed(2)} TON</span>
            <button
              type="button"
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
                className={betStep === step ? "active" : ""}
                onClick={() => dispatch(setBetStep(step))}
                disabled={status !== "idle"}
              >
                {step} TON
              </button>
            ))}
          </div>

          <div className={`autoplay ${autoplayOpen ? "open" : ""}`}>
            <button
              type="button"
              className="autoplay-toggle"
              onClick={() => setAutoplayOpen((value) => !value)}
            >
              Autoplay {autoplayRemaining > 0 ? `(${autoplayRemaining})` : ""}
            </button>
            {autoplayRemaining > 0 ? (
              <button
                type="button"
                className="autoplay-stop"
                onClick={() => dispatch(stopAutoplay())}
              >
                Stop
              </button>
            ) : null}
            {autoplayOpen ? (
              <div className="autoplay-panel">
                {autoplayOptions.map((count) => (
                  <button
                    key={count}
                    type="button"
                    className={autoplayCount === count ? "active" : ""}
                    onClick={() => dispatch(setAutoplayCount(count))}
                    disabled={status !== "idle"}
                  >
                    {count}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        <div className="control-panel right">
          <div className="speed-controls">
            <button
              type="button"
              className={speed === "normal" ? "active" : ""}
              onClick={() => dispatch(setSpeed("normal"))}
            >
              Normal
            </button>
            <button
              type="button"
              className={speed === "fast" ? "active" : ""}
              onClick={() => dispatch(setSpeed("fast"))}
            >
              Fast
            </button>
          </div>

          <button
            type="button"
            className={demoMode ? "demo active" : "demo"}
            onClick={() => dispatch(setDemoMode(!demoMode))}
          >
            Demo
          </button>

          <button type="button" className="play" onClick={handlePlay} disabled={!canPlay}>
            {status === "idle" ? "Play" : "In Flight"}
          </button>
        </div>
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
            <div className="big-win-value">{winAmount.toFixed(2)} TON</div>
          </div>
        </div>
      ) : null}

      {flyWin ? (
        <div className="win-fly">
          <span className="win-fly-token">+{winAmount.toFixed(2)} TON</span>
        </div>
      ) : null}
    </div>
  );
}
