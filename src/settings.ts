import type { Quality } from "./game/engine";

export type ControlMode = "auto" | "touch" | "keyboard";
export type Difficulty = "recruit" | "soldier" | "veteran";

export interface Settings {
  sensitivity: number;
  quality: Quality;
  controls: ControlMode;
  difficulty: Difficulty;

  gyro: boolean;
  autoSprint: boolean;
  autoPickup: boolean;
  aimAssist: boolean;

  hitMarkers: boolean;
  damageNumbers: boolean;
  fpsCounter: boolean;

  shadows: boolean;
  particles: boolean;
  bloom: boolean;

  masterVolume: number;
  musicVolume: number;
  effectsVolume: number;
}

export const DEFAULT_SETTINGS: Settings = {
  sensitivity: 1,
  quality: "high",
  controls: "auto",
  difficulty: "soldier",

  gyro: false,
  autoSprint: true,
  autoPickup: true,
  aimAssist: true,

  hitMarkers: true,
  damageNumbers: true,
  fpsCounter: true,

  shadows: true,
  particles: true,
  bloom: true,

  masterVolume: 1,
  musicVolume: 0.8,
  effectsVolume: 1
};

const KEY = "blockfront-settings";

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      return {
        ...DEFAULT_SETTINGS,
        ...JSON.parse(raw)
      };
    }
  } catch {}

  return { ...DEFAULT_SETTINGS };
}

export function saveSettings(s: Settings) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {}
}

export function enemyCountFor(d: Difficulty): number {
  switch (d) {
    case "recruit":
      return 8;
    case "soldier":
      return 12;
    case "veteran":
      return 18;
  }
}

export function isTouchDevice(): boolean {
  return (
    typeof window !== "undefined" &&
    ("ontouchstart" in window ||
      (navigator.maxTouchPoints ?? 0) > 0)
  );
}

export function resolveMobile(
  controls: ControlMode
): boolean {
  if (controls === "touch") return true;
  if (controls === "keyboard") return false;
  return isTouchDevice();
}
