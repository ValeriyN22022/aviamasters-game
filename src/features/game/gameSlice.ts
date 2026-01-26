import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { GameState, LandingTarget, SpeedMode } from "./types";

const initialState: GameState = {
  status: "idle",
  speed: "normal",
  bet: 1,
  betStep: 10,
  balance: 1000,
  currentWin: 1,
  lastWin: 0,
  demoMode: false,
  autoplayCount: 0,
  autoplayRemaining: 0,
  flightTimeMs: 0,
  flightDurationMs: 8000,
  landingTarget: "ship",
  plane: {
    y: 270,
    tilt: 0,
  },
  items: [],
  lastOutcome: null,
};

type StartPayload = {
  flightDurationMs: number;
  landingTarget: LandingTarget;
};

type FramePayload = {
  planeY: number;
  planeTilt: number;
  items: GameState["items"];
  flightTimeMs: number;
  status: GameState["status"];
  currentWin: number;
};

type FinishPayload = {
  finalWin: number;
  outcome: GameState["lastOutcome"];
};

const gameSlice = createSlice({
  name: "game",
  initialState,
  reducers: {
    setBet(state, action: PayloadAction<number>) {
      state.bet = action.payload;
    },
    setBetStep(state, action: PayloadAction<number>) {
      state.betStep = action.payload;
    },
    setSpeed(state, action: PayloadAction<SpeedMode>) {
      state.speed = action.payload;
    },
    setDemoMode(state, action: PayloadAction<boolean>) {
      state.demoMode = action.payload;
    },
    setAutoplayCount(state, action: PayloadAction<number>) {
      state.autoplayCount = action.payload;
      state.autoplayRemaining = action.payload;
    },
    decrementAutoplay(state) {
      state.autoplayRemaining = Math.max(0, state.autoplayRemaining - 1);
    },
    stopAutoplay(state) {
      state.autoplayRemaining = 0;
    },
    startGame(state, action: PayloadAction<StartPayload>) {
      state.status = "takingOff";
      state.flightTimeMs = 0;
      state.flightDurationMs = action.payload.flightDurationMs;
      state.landingTarget = action.payload.landingTarget;
      state.currentWin = state.bet;
      state.items = [];
      state.plane = {
        y: 270,
        tilt: -10,
      };
      state.lastOutcome = null;
    },
    frameUpdated(state, action: PayloadAction<FramePayload>) {
      state.flightTimeMs = action.payload.flightTimeMs;
      state.status = action.payload.status;
      state.plane.y = action.payload.planeY;
      state.plane.tilt = action.payload.planeTilt;
      state.items = action.payload.items;
      state.currentWin = action.payload.currentWin;
    },
    finishGame(state, action: PayloadAction<FinishPayload>) {
      state.status = "idle";
      state.currentWin = action.payload.finalWin;
      state.lastWin = action.payload.finalWin;
      if (!state.demoMode) {
        state.balance = Math.max(0, state.balance - state.bet + action.payload.finalWin);
      }
      state.lastOutcome = action.payload.outcome;
      // Сброс игровой зоны в начальное состояние
      state.plane = {
        y: 270,
        tilt: 0,
      };
      state.items = [];
      state.flightTimeMs = 0;
    },
  },
});

export const {
  setBet,
  setBetStep,
  setSpeed,
  setDemoMode,
  setAutoplayCount,
  decrementAutoplay,
  stopAutoplay,
  startGame,
  frameUpdated,
  finishGame,
} =
  gameSlice.actions;

export default gameSlice.reducer;
