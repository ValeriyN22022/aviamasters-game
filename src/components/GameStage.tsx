import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../app/store";
import {
  decrementAutoplay,
  finishGame,
  frameUpdated,
  setDemoMode,
  startGame,
  stopAutoplay,
} from "../features/game/gameSlice";
import type { GameItem, GameStatus, ItemType } from "../features/game/types";
import planeImage from "../assets/plane.png";
import shipImage from "../assets/ship.png";
import bonusImage from "../assets/bonus.png";
import torpedoImage from "../assets/torpedo.png";
import explosion1Image from "../assets/explosion1.png";
import explosion2Image from "../assets/explosion2.png";
import explosion3Image from "../assets/explosion3.png";
import collect1Sound from "../../sounds/collect1_UBCrpxzy.ogg";
import collect2Sound from "../../sounds/collect2_CszgpPZS.ogg";
import collect3Sound from "../../sounds/collect3_2nuziKj8.ogg";
import collect4Sound from "../../sounds/collect4_GCDA9-a3.ogg";
import collectM1Sound from "../../sounds/collect-m1_ePiECT3A.ogg";
import collectM2Sound from "../../sounds/collect-m2_oB6Wocj7.ogg";
import collectM3Sound from "../../sounds/collect-m3_OXNsY_oS.ogg";
import collectM4Sound from "../../sounds/collect-m4_VkzrdqLL.ogg";
import explosionSound from "../../sounds/взрыв бомбочки.ogg";
import waterLandingSound from "../../sounds/падение в воду.ogg";
import winLowSound from "../../sounds/выигрыш до x2.ogg";
import winMediumSound from "../../sounds/выигрыш x2-x5.ogg";
import winHighSound from "../../sounds/выигрыш x5-x9.99.ogg";
import flightSound from "../../sounds/полет самолетика.ogg";
import tonSvg from "../assets/ton.svg";

const STAGE = { width: 920, height: 420 };
const PLANE_X = 148;
const WATER_Y = 289;
const DECK_Y = 238;
const CRUISE_Y = 180;
const SHIP_WIDTH = 520;
const SHIP_HEIGHT = 140;
const SHIP_BOTTOM = 52;
const SHIP_GAP = 660;
const SHIP_SPEED = 0.12;

const initialShips = (): { id: string; x: number }[] => {
  const t = Date.now();
  return [
    { id: `ship-${t}-0`, x: 0 },
    { id: `ship-${t}-1`, x: SHIP_GAP },
  ];
};
const TAKEOFF_MS = 1400;
const LANDING_MS = 1400;
const ITEM_SPEED = 0.22;

const lerp = (from: number, to: number, t: number) => from + (to - from) * t;
const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
const easeInCubic = (t: number) => t * t * t;

const randomBetween = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

const createItem = (): GameItem => {
  const roll = Math.random();
  let type: ItemType = "bonus";
  if (roll >= 0.75) {
    type = "torpedo";
  } else if (roll >= 0.45) {
    type = "multiplier";
  }
  const value =
    type === "bonus" ? randomBetween(5, 35) : type === "multiplier" ? randomBetween(2, 8) : 0.5;

  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    type,
    value,
    x: STAGE.width + randomBetween(0, 200),
    y: randomBetween(120, 240),
    collected: false,
  };
};

const itemLabel = (item: GameItem) => {
  if (item.type === "torpedo") {
    return "";
  }
  if (item.type === "multiplier") {
    return `x${item.value}`;
  }
  return `+${item.value}`;
};

const itemImage = (item: GameItem) => {
  if (item.type === "torpedo") {
    return torpedoImage;
  }
  if (item.type === "multiplier") {
    return bonusImage;
  }
  return bonusImage;
};

const cloudImports = import.meta.glob("../assets/clouds/*.png", {
  eager: true,
  import: "default",
}) as Record<string, string>;

const cloudImages = Object.values(cloudImports);

const cloudConfigs = [
  { top: 10, size: 90, duration: 7, delay: -2, opacity: 0.7 },
  { top: 26, size: 110, duration: 9, delay: -5, opacity: 0.6 },
  { top: 6, size: 70, duration: 6, delay: -3, opacity: 0.55 },
  { top: 34, size: 140, duration: 11, delay: -6, opacity: 0.5 },
  { top: 18, size: 95, duration: 8, delay: -4, opacity: 0.6 },
  { top: 2, size: 75, duration: 7.5, delay: -5.5, opacity: 0.65 },
];

const bonusSounds = [collect1Sound, collect2Sound, collect3Sound, collect4Sound];
const multiplierSounds = [collectM1Sound, collectM2Sound, collectM3Sound, collectM4Sound];

const playSound = (src: string, volume: number = 0.7) => {
  try {
    const audio = new Audio(src);
    audio.volume = volume;
    audio.play().catch(() => {});
  } catch (e) {}
};

export default function GameStage() {
  const dispatch = useDispatch();
  const {
    status,
    speed,
    flightDurationMs,
    landingTarget,
    plane,
    items,
    ships,
    currentWin,
    bet,
    balance,
    autoplayRemaining,
    demoMode,
    lastOutcome,
    landingShipX,
  } = useSelector((state: RootState) => state.game);

  const lastTimeRef = useRef<number | null>(null);
  const itemsRef = useRef<GameItem[]>([]);
  const shipsRef = useRef<{ id: string; x: number }[]>([]);
  const planeYRef = useRef<number>(plane.y);
  const planeTiltRef = useRef<number>(plane.tilt);
  const altitudeOffsetRef = useRef<number>(0);
  const flightTimeRef = useRef<number>(0);
  const statusRef = useRef<GameStatus>(status);
  const nextSpawnRef = useRef<number>(600);
  const winRef = useRef<number>(currentWin);
  const landingStartRef = useRef<{ time: number; y: number }>({ time: 0, y: plane.y });
  const rafRef = useRef<number | null>(null);
  const autoplayTimeoutRef = useRef<number | null>(null);
  const bonusSoundIndexRef = useRef<number>(0);
  const multiplierSoundIndexRef = useRef<number>(0);
  const flightAudioRef = useRef<HTMLAudioElement | null>(null);
  const explosionRef = useRef<{ active: boolean; startTime: number; frame: number; x: number; y: number }>({
    active: false,
    startTime: 0,
    frame: 0,
    x: 0,
    y: 0,
  });
  const [explosion, setExplosion] = useState<{ active: boolean; x: number; y: number; frame: number }>({
    active: false,
    x: 0,
    y: 0,
    frame: 0,
  });

  useEffect(() => {
    if (status === "takingOff") {
      itemsRef.current = [];
      shipsRef.current = initialShips();
      planeYRef.current = DECK_Y;
      planeTiltRef.current = -12;
      altitudeOffsetRef.current = 0;
      flightTimeRef.current = 0;
      statusRef.current = "takingOff";
      nextSpawnRef.current = 300;
      winRef.current = bet;
      lastTimeRef.current = null;
      landingStartRef.current = { time: 0, y: DECK_Y };
      explosionRef.current = { active: false, startTime: 0, frame: 0, x: 0, y: 0 };
      setExplosion({ active: false, x: 0, y: 0, frame: 0 });
      bonusSoundIndexRef.current = 0;
      multiplierSoundIndexRef.current = 0;
      if (flightAudioRef.current) {
        flightAudioRef.current.pause();
        flightAudioRef.current.currentTime = 0;
        flightAudioRef.current = null;
      }
      flightAudioRef.current = new Audio(flightSound);
      flightAudioRef.current.loop = true;
      flightAudioRef.current.volume = 0.5;
      flightAudioRef.current.preload = "auto";
      flightAudioRef.current.play().catch(() => {});
    } else if (status === "idle" && statusRef.current !== "idle") {
      itemsRef.current = [];
      shipsRef.current = [];
      planeYRef.current = plane.y;
      planeTiltRef.current = plane.tilt;
      altitudeOffsetRef.current = 0;
      flightTimeRef.current = 0;
      statusRef.current = "idle";
      nextSpawnRef.current = 300;
      winRef.current = bet;
      lastTimeRef.current = null;
      landingStartRef.current = { time: 0, y: plane.y };
      explosionRef.current = { active: false, startTime: 0, frame: 0, x: 0, y: 0 };
      setExplosion({ active: false, x: 0, y: 0, frame: 0 });
      bonusSoundIndexRef.current = 0;
      multiplierSoundIndexRef.current = 0;
      if (flightAudioRef.current) {
        flightAudioRef.current.pause();
        flightAudioRef.current.currentTime = 0;
        flightAudioRef.current = null;
      }
    }
  }, [status, bet]);

  useEffect(() => {
    if (status === "idle") {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
      if (autoplayTimeoutRef.current) {
        window.clearTimeout(autoplayTimeoutRef.current);
        autoplayTimeoutRef.current = null;
      }
      if (flightAudioRef.current) {
        flightAudioRef.current.pause();
        flightAudioRef.current.currentTime = 0;
      }
      return;
    }

    lastTimeRef.current = null;

    const tick = (now: number) => {
      if (!lastTimeRef.current) {
        lastTimeRef.current = now;
      }
      const delta = now - lastTimeRef.current;
      lastTimeRef.current = now;

      const speedFactor = speed === "fast" ? 1.6 : 1;
      const dt = delta * speedFactor;

      flightTimeRef.current += dt;

      if (statusRef.current === "takingOff") {
        const t = clamp(flightTimeRef.current / TAKEOFF_MS, 0, 1);
        planeYRef.current = lerp(DECK_Y, CRUISE_Y, easeOutCubic(t));
        planeTiltRef.current = lerp(-12, -2, t);
        if (t >= 1) {
          statusRef.current = "flying";
          if (flightAudioRef.current) {
            if (flightAudioRef.current.paused || flightAudioRef.current.ended || flightAudioRef.current.readyState === 0) {
              if (flightAudioRef.current.readyState === 0) {
                flightAudioRef.current.load();
              }
              flightAudioRef.current.play().catch(() => {});
            }
          } else {
            flightAudioRef.current = new Audio(flightSound);
            flightAudioRef.current.loop = true;
            flightAudioRef.current.volume = 0.5;
            flightAudioRef.current.play().catch(() => {});
          }
        }
      }

      if (statusRef.current === "flying") {
        const sway = Math.sin(flightTimeRef.current / 260) * 6;
        const targetY = clamp(CRUISE_Y + sway + altitudeOffsetRef.current, 120, 260);
        planeYRef.current = lerp(planeYRef.current, targetY, 0.12);
        planeTiltRef.current = lerp(
          planeTiltRef.current,
          -2 + Math.sin(flightTimeRef.current / 400) * 3,
          0.1,
        );

        if (flightTimeRef.current >= flightDurationMs) {
          statusRef.current = "landing";
          landingStartRef.current = {
            time: flightTimeRef.current,
            y: planeYRef.current,
          };
        }
      }

      if (statusRef.current === "landing") {
        if (flightAudioRef.current) {
          if (flightAudioRef.current.paused || flightAudioRef.current.ended) {
            flightAudioRef.current.play().catch(() => {});
          }
        }
        
        const t = clamp(
          (flightTimeRef.current - landingStartRef.current.time) / LANDING_MS,
          0,
          1,
        );
        const targetY = landingTarget === "water" ? WATER_Y : DECK_Y;
        planeYRef.current = lerp(landingStartRef.current.y, targetY, easeInCubic(t));
        planeTiltRef.current = lerp(4, 12, t);

        if (t >= 1) {
          if (flightAudioRef.current) {
            flightAudioRef.current.pause();
            flightAudioRef.current.currentTime = 0;
          }
          
          const finalWin = landingTarget === "water" ? 0 : winRef.current;
          const outcome =
            landingTarget === "water"
              ? "water"
              : finalWin >= bet
                ? "shipWin"
                : "shipLose";
          const shipUnderPlane = shipsRef.current.find(
            (s) => s.x <= PLANE_X && s.x + SHIP_WIDTH >= PLANE_X
          );
          const shipX = landingTarget === "ship" && shipUnderPlane ? shipUnderPlane.x : null;

          if (landingTarget === "water") {
            playSound(waterLandingSound, 0.7);
          } else {
            const multiplier = finalWin / bet;
            if (multiplier >= 5) {
              playSound(winHighSound, 0.8);
            } else if (multiplier >= 2) {
              playSound(winMediumSound, 0.8);
            } else if (multiplier > 0) {
              playSound(winLowSound, 0.8);
            }
          }

          dispatch(finishGame({ finalWin, outcome, landingShipX: shipX }));
          if (autoplayRemaining > 0) {
            const nextRemaining = Math.max(0, autoplayRemaining - 1);
            dispatch(decrementAutoplay());
            const nextBalance = demoMode
              ? balance
              : Math.max(0, balance - bet + finalWin);
            const canContinue = nextRemaining > 0 && (demoMode || nextBalance >= bet);

            if (canContinue) {
              autoplayTimeoutRef.current = window.setTimeout(() => {
                const nextFlightDurationMs = randomBetween(6500, 10500);
                const nextLandingTarget = Math.random() < 0.18 ? "water" : "ship";
                dispatch(
                  startGame({
                    flightDurationMs: nextFlightDurationMs,
                    landingTarget: nextLandingTarget,
                  }),
                );
              }, 750);
            } else if (!demoMode && nextBalance < bet) {
              dispatch(stopAutoplay());
            }
          }
          statusRef.current = "idle";
          if (explosionRef.current.active) {
            explosionRef.current.active = false;
            setExplosion({ active: false, x: 0, y: 0, frame: 0 });
          }
        }
      }

      if (explosionRef.current.active && statusRef.current !== "idle") {
        const explosionTime = flightTimeRef.current - explosionRef.current.startTime;
        const totalDuration = 500;
        const frameDuration = totalDuration / 3;
        const newFrame = Math.floor(explosionTime / frameDuration);
        
        if (explosionTime < totalDuration && newFrame < 3) {
          explosionRef.current.frame = newFrame;
          setExplosion({
            active: true,
            x: explosionRef.current.x,
            y: explosionRef.current.y,
            frame: newFrame,
          });
        } else {
          explosionRef.current.active = false;
          setExplosion({ active: false, x: 0, y: 0, frame: 0 });
        }
      }

      if (statusRef.current === "flying") {
        if (flightAudioRef.current) {
          if (flightAudioRef.current.paused || flightAudioRef.current.ended) {
            if (flightAudioRef.current.readyState === 0) {
              flightAudioRef.current.load();
              flightAudioRef.current.addEventListener("canplay", () => {
                flightAudioRef.current?.play().catch(() => {});
              }, { once: true });
            } else {
              flightAudioRef.current.play().catch(() => {});
            }
          }
        } else {
          flightAudioRef.current = new Audio(flightSound);
          flightAudioRef.current.loop = true;
          flightAudioRef.current.volume = 0.5;
          flightAudioRef.current.play().catch(() => {});
        }
        
        if (flightTimeRef.current >= nextSpawnRef.current) {
          itemsRef.current = [...itemsRef.current, createItem()];
          nextSpawnRef.current += randomBetween(200, 400);
        }
      }

      const updatedItems = itemsRef.current
        .map((item) => {
          if (item.collected) {
            return { ...item, x: item.x - ITEM_SPEED * dt };
          }
          const nextX = item.x - ITEM_SPEED * dt;
          const hit =
            Math.abs(nextX - PLANE_X) < 48 && Math.abs(item.y - planeYRef.current) < 36;
          if (hit) {
            if (item.type === "torpedo") {
              winRef.current = Math.max(0, winRef.current / 2);
              altitudeOffsetRef.current = clamp(altitudeOffsetRef.current + 16, -40, 80);
              const torpedoCenterX = nextX + 24;
              const torpedoCenterY = item.y + 24;
              explosionRef.current = {
                active: true,
                startTime: flightTimeRef.current,
                frame: 0,
                x: torpedoCenterX,
                y: torpedoCenterY,
              };
              setExplosion({
                active: true,
                x: torpedoCenterX,
                y: torpedoCenterY,
                frame: 0,
              });
              playSound(explosionSound, 0.8);
            } else if (item.type === "multiplier") {
              winRef.current = winRef.current * item.value;
              altitudeOffsetRef.current = clamp(altitudeOffsetRef.current - 10, -40, 80);
              playSound(multiplierSounds[multiplierSoundIndexRef.current], 0.7);
              multiplierSoundIndexRef.current = (multiplierSoundIndexRef.current + 1) % multiplierSounds.length;
            } else {
              winRef.current = winRef.current + item.value;
              altitudeOffsetRef.current = clamp(altitudeOffsetRef.current - 6, -40, 80);
              playSound(bonusSounds[bonusSoundIndexRef.current], 0.7);
              bonusSoundIndexRef.current = (bonusSoundIndexRef.current + 1) % bonusSounds.length;
            }
            return { ...item, x: nextX, collected: true };
          }
          return { ...item, x: nextX };
        })
        .filter((item) => item.x > -60);

      itemsRef.current = updatedItems;

      let updatedShips = shipsRef.current.map((s) => ({ ...s, x: s.x - SHIP_SPEED * dt }));
      updatedShips = updatedShips.filter((s) => s.x + SHIP_WIDTH > 0);
      const maxX = updatedShips.length ? Math.max(...updatedShips.map((s) => s.x)) : 0;
      while (updatedShips.length < 2) {
        updatedShips.push({
          id: `ship-${Date.now()}-${updatedShips.length}`,
          x: maxX + SHIP_GAP,
        });
      }
      shipsRef.current = updatedShips;

      if (statusRef.current !== "idle") {
        dispatch(
          frameUpdated({
            planeY: planeYRef.current,
            planeTilt: planeTiltRef.current,
            items: updatedItems,
            ships: updatedShips,
            flightTimeMs: flightTimeRef.current,
            status: statusRef.current,
            currentWin: winRef.current,
          }),
        );
      }

      if (statusRef.current !== "idle") {
        rafRef.current = requestAnimationFrame(tick);
      }
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
      if (flightAudioRef.current) {
        flightAudioRef.current.pause();
        flightAudioRef.current.currentTime = 0;
        flightAudioRef.current = null;
      }
    };
  }, [
    status,
    speed,
    flightDurationMs,
    landingTarget,
    dispatch,
    bet,
    autoplayRemaining,
    demoMode,
    balance,
  ]);

  const landingClass =
    status === "landing"
      ? landingTarget === "water"
        ? "stage--landing-water"
        : "stage--landing-ship"
      : lastOutcome === "shipWin"
        ? "stage--landed-shipwin"
        : lastOutcome === "shipLose"
          ? "stage--landed-shiploss"
          : lastOutcome === "water"
            ? "stage--landed-water"
            : "";

  return (
    <div className="stage-container">
      <div className={`stage ${landingClass}`} style={{ width: STAGE.width, height: STAGE.height }}>
      <div className="sky" />
      <div className="cloud-layer">
        {cloudConfigs.map((cloud, index) => (
          <div
            key={cloud.top + index}
            className="cloud"
            style={{
              top: cloud.top,
              width: cloud.size,
              height: cloud.size * 0.6,
              opacity: cloud.opacity,
              backgroundImage: `url(${cloudImages[index % cloudImages.length]})`,
              animationDuration: `${cloud.duration}s`,
              animationDelay: `${cloud.delay}s`,
            }}
          />
        ))}
      </div>
      <div className="sea" />
      {ships.map((ship) => (
        <div
          key={ship.id}
          className="ship"
          style={{
            left: ship.x,
            bottom: SHIP_BOTTOM,
            width: SHIP_WIDTH,
            height: SHIP_HEIGHT,
            backgroundImage: `url(${shipImage})`,
          }}
        />
      ))}
      <div
        className="landing-effect landing-effect-water"
        style={{ left: STAGE.width / 2 - 120, bottom: SHIP_BOTTOM }}
      />
      <div
        className="landing-effect landing-effect-shipwin"
        style={{
          left: (landingShipX ?? 0) + SHIP_WIDTH / 2 - 120,
          bottom: SHIP_BOTTOM,
        }}
      />
      <div
        className="landing-effect landing-effect-shiploss"
        style={{
          left: (landingShipX ?? 0) + SHIP_WIDTH / 2 - 120,
          bottom: SHIP_BOTTOM,
        }}
      />
      {explosion.active && (
        <div
          className="explosion"
          style={{
            transform: `translate(${explosion.x - 40}px, ${explosion.y - 40}px)`,
            backgroundImage: `url(${
              explosion.frame === 0
                ? explosion1Image
                : explosion.frame === 1
                  ? explosion2Image
                  : explosion3Image
            })`,
          }}
        />
      )}
      <div
        className={`plane plane-${status}`}
        style={{
          transform: `translate(${PLANE_X}px, ${plane.y}px) rotate(${plane.tilt}deg)`,
          backgroundImage: `url(${planeImage})`,
          opacity: explosion.active ? 0.3 : 1,
        }}
      />
      {items.map((item) => (
        <div
          key={item.id}
          className={`item item-${item.type} ${item.collected ? "collected" : ""}`}
          style={{
            transform: `translate(${item.x}px, ${item.y}px)`,
            backgroundImage: `url(${itemImage(item)})`,
          }}
        >
          {itemLabel(item) && <span className="item-label">{itemLabel(item)}</span>}
        </div>
      ))}
      <div className="hud">
        <button
          type="button"
          className={`hud-demo ${demoMode ? "hud-demo--active" : ""}`}
          onClick={() => dispatch(setDemoMode(!demoMode))}
          aria-pressed={demoMode}
          aria-label="Демо режим"
        >
          <span className="hud-demo-label">Демо</span>
          <span className="hud-demo-track">
            <span className="hud-demo-thumb" />
          </span>
        </button>
        <div className="hud-balance">
          <span className="hud-balance-icon-wrap">
            <img src={tonSvg} alt="" className="hud-balance-icon" />
          </span>
          <span className="hud-balance-value">{balance.toFixed(2)}</span>
          <button type="button" className="hud-balance-add" aria-label="Пополнить">
            +
          </button>
        </div>
      </div>
      </div>
    </div>
  );
}
