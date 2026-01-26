export type GameStatus = "idle" | "takingOff" | "flying" | "landing";
export type SpeedMode = "normal" | "fast";
export type LandingTarget = "water" | "ship";
export type ItemType = "bonus" | "multiplier" | "torpedo";

export interface GameItem {
  id: string;
  type: ItemType;
  value: number;
  x: number;
  y: number;
  collected: boolean;
}

export interface GamePlane {
  y: number;
  tilt: number;
}

export interface GameState {
  status: GameStatus;
  speed: SpeedMode;
  bet: number;
  betStep: number;
  balance: number;
  currentWin: number;
  lastWin: number;
  demoMode: boolean;
  autoplayCount: number;
  autoplayRemaining: number;
  flightTimeMs: number;
  flightDurationMs: number;
  landingTarget: LandingTarget;
  plane: GamePlane;
  items: GameItem[];
  lastOutcome: "water" | "shipWin" | "shipLose" | null;
}
