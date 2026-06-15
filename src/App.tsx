import { useEffect, useRef, useState, useCallback } from "react";
import { Game, WEAPONS, type HudState } from "./game/engine";
import { Minimap } from "./Minimap";
import { TouchControls } from "./TouchControls";
import { SettingsPanel } from "./SettingsPanel";
import {
  loadSettings,
  saveSettings,
  resolveMobile,
  enemyCountFor,
  type Settings,
} from "./settings";

type Screen = "menu" | "playing" | "won" | "lost";

const WEAPON_ICONS = ["🔫", "🔫", "💣", "🩹", "🔪", "🚀"];

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<Game | null>(null);
  const [screen, setScreen] = useState<Screen>("menu");
  const [hud, setHud] = useState<HudState | null>(null);
  const [gameKey, setGameKey] = useState(0);
  const [settings, setSettings] = useState<Settings>(() => loadSettings());
  const [showSettings, setShowSettings] = useState(false);
  const [paused, setPaused] = useState(false);
  const [portrait, setPortrait] = useState(false);

  const mobile = resolveMobile(settings.controls);

  // persist settings + live-apply sensitivity
  useEffect(() => {
    saveSettings(settings);
    gameRef.current?.setSensitivity(settings.sensitivity);
  }, [settings]);

  // orientation watcher
  useEffect(() => {
    const check = () => setPortrait(window.innerHeight > window.innerWidth);
    check();
    window.addEventListener("resize", check);
    window.addEventListener("orientationchange", check);
    return () => {
      window.removeEventListener("resize", check);
      window.removeEventListener("orientationchange", check);
    };
  }, []);

  const onHud = useCallback((s: HudState) => {
    setHud(s);
    if (s.status === "won") setScreen((p) => (p === "playing" ? "won" : p));
    if (s.status === "lost") setScreen((p) => (p === "playing" ? "lost" : p));
  }, []);

  useEffect(() => {
    if (screen !== "playing") return;
    if (!canvasRef.current) return;
    const g = new Game(canvasRef.current, onHud, {
      mobile,
      sensitivity: settings.sensitivity,
      quality: settings.quality,
      enemyCount: enemyCountFor(settings.difficulty),
    });
    gameRef.current = g;
    g.start();
    return () => {
      g.dispose();
      gameRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen, gameKey]);

  // pause via ESC
  useEffect(() => {
    if (screen !== "playing") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Escape") togglePause();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen, paused]);

  const startGame = async () => {
    setHud(null);
    setPaused(false);
    setShowSettings(false);
    setGameKey((k) => k + 1);
    setScreen("playing");
    // try to lock landscape on mobile
    try {
      // @ts-expect-error vendor api
      await window.screen?.orientation?.lock?.("landscape");
    } catch {
      void 0;
    }
  };

  const togglePause = () => {
    setPaused((p) => {
      const np = !p;
      gameRef.current?.setPaused(np);
      return np;
    });
  };

  const resume = () => {
    setPaused(false);
    setShowSettings(false);
    gameRef.current?.setPaused(false);
  };

  const quitToMenu = () => {
    setPaused(false);
    setShowSettings(false);
    setScreen("menu");
  };

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-black font-sans select-none">
      {screen === "playing" && (
        <>
          <canvas ref={canvasRef} className="block h-full w-full cursor-crosshair" />
          {hud && <Hud hud={hud} game={gameRef.current} mobile={mobile} onPause={togglePause} />}
          {mobile && hud && hud.status === "playing" && !paused && (
            <TouchControls game={gameRef.current} weaponIndex={hud.weaponIndex} />
          )}

          {/* Pause overlay */}
          {paused && (
            <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/70 backdrop-blur-sm">
              {showSettings ? (
                <SettingsPanel
                  settings={settings}
                  onChange={setSettings}
                  onClose={() => setShowSettings(false)}
                  title="SETTINGS"
                />
              ) : (
                <div className="w-72 rounded-2xl border border-white/15 bg-slate-900/90 p-6 text-center text-white shadow-2xl">
                  <h2 className="mb-5 text-3xl font-black tracking-wide">PAUSED</h2>
                  <div className="space-y-3">
                    <MenuButton onClick={resume} color="emerald">▶ RESUME</MenuButton>
                    <MenuButton onClick={() => setShowSettings(true)} color="slate">⚙ SETTINGS</MenuButton>
                    <MenuButton onClick={quitToMenu} color="red">⌂ QUIT TO MENU</MenuButton>
                  </div>
                  <p className="mt-4 text-[11px] text-white/50">
                    Some changes apply on next deploy.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Rotate device prompt */}
          {mobile && portrait && <RotatePrompt />}
        </>
      )}

      {screen === "menu" && (
        <MenuScreen
          onStart={startGame}
          onOpenSettings={() => setShowSettings(true)}
          mobile={mobile}
        />
      )}
      {screen === "won" && (
        <EndScreen win kills={hud?.kills ?? 0} onRestart={startGame} onMenu={() => setScreen("menu")} />
      )}
      {screen === "lost" && (
        <EndScreen win={false} kills={hud?.kills ?? 0} onRestart={startGame} onMenu={() => setScreen("menu")} />
      )}

      {/* Settings modal from main menu */}
      {screen === "menu" && showSettings && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <SettingsPanel settings={settings} onChange={setSettings} onClose={() => setShowSettings(false)} />
        </div>
      )}
    </div>
  );
}

function MenuButton({ onClick, color, children }: { onClick: () => void; color: "emerald" | "slate" | "red" | "amber"; children: React.ReactNode }) {
  const colors: Record<string, string> = {
    emerald: "from-emerald-400 to-emerald-600 border-emerald-800",
    slate: "from-slate-400 to-slate-600 border-slate-700",
    red: "from-rose-400 to-rose-600 border-rose-800",
    amber: "from-amber-300 to-amber-500 border-amber-700 text-amber-950",
  };
  return (
    <button
      onClick={onClick}
      className={`w-full rounded-xl border-b-4 bg-gradient-to-b ${colors[color]} px-6 py-3 text-lg font-black text-white shadow-lg transition active:translate-y-0.5 active:border-b-2 hover:brightness-110`}
    >
      {children}
    </button>
  );
}

/* ----------------------------- HUD ----------------------------- */
function Hud({ hud, game, mobile, onPause }: { hud: HudState; game: Game | null; mobile: boolean; onPause: () => void }) {
  const w = WEAPONS[hud.weaponIndex];
  return (
    <div className="pointer-events-none absolute inset-0 text-white">
      {hud.hitFlash > 0 && <div className="absolute inset-0 bg-red-600" style={{ opacity: hud.hitFlash * 0.35 }} />}

      {/* crosshair */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="relative h-6 w-6">
          <span className="absolute left-1/2 top-0 h-2 w-[2px] -translate-x-1/2 bg-white/80" />
          <span className="absolute left-1/2 bottom-0 h-2 w-[2px] -translate-x-1/2 bg-white/80" />
          <span className="absolute top-1/2 left-0 w-2 h-[2px] -translate-y-1/2 bg-white/80" />
          <span className="absolute top-1/2 right-0 w-2 h-[2px] -translate-y-1/2 bg-white/80" />
          <span className="absolute left-1/2 top-1/2 h-1 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-red-500" />
        </div>
      </div>

      {/* damage direction */}
      {hud.hitFlash > 0 && (
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <div style={{ transform: `rotate(${(hud.damageDir * 180) / Math.PI}deg)` }} className="h-40 w-40">
            <div
              className="absolute left-1/2 top-0 -translate-x-1/2 border-x-[14px] border-b-[22px] border-x-transparent border-b-red-500"
              style={{ opacity: hud.hitFlash }}
            />
          </div>
        </div>
      )}

      {/* top-left status */}
      <div className="absolute left-4 top-4 w-56 space-y-2 md:w-64">
        <div className="flex items-center gap-2">
          <PlayerChip />
          <div className="flex-1 space-y-1.5">
            <Bar label="🛡" value={hud.shield} max={100} color="from-sky-400 to-blue-600" text={`${hud.shield}`} />
            <Bar label="➕" value={hud.health} max={100} color="from-lime-400 to-green-600" text={`${hud.health}`} />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-amber-300">⛽FUEL</span>
          <div className="h-2.5 flex-1 overflow-hidden rounded-full border border-amber-500/50 bg-black/40">
            <div
              className={`h-full rounded-full bg-gradient-to-r ${hud.flying ? "from-orange-400 to-red-500" : "from-amber-300 to-orange-500"}`}
              style={{ width: `${hud.fuel}%` }}
            />
          </div>
        </div>
      </div>

      {/* top-right minimap + zone + pause */}
      <div className="absolute right-4 top-4 flex flex-col items-end gap-2">
        <div className="flex items-start gap-2">
          <button
            onClick={onPause}
            className="pointer-events-auto rounded-lg border border-white/25 bg-black/50 px-3 py-2 text-sm font-black backdrop-blur hover:bg-white/15"
          >
            ❚❚
          </button>
          <Minimap hud={hud} />
        </div>
        <div className="rounded-lg border border-white/20 bg-black/50 px-3 py-1.5 text-right backdrop-blur">
          <div className="text-sm font-bold text-emerald-400">⬤ {hud.alive} ALIVE</div>
          <div className={`text-xs font-semibold ${hud.zoneShrinking ? "text-red-400" : "text-sky-300"}`}>
            {hud.zoneShrinking ? "⚠ SHRINKING" : "ZONE"} · {hud.zoneTime}s
          </div>
        </div>
      </div>

      {hud.zoneShrinking && (
        <div className="absolute left-1/2 top-16 -translate-x-1/2 animate-pulse rounded-md border border-red-500/60 bg-black/70 px-4 py-1.5 text-sm font-extrabold tracking-wide text-red-400 backdrop-blur">
          ⚠ SAFE ZONE IS SHRINKING!
        </div>
      )}

      {/* kills */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-center backdrop-blur">
        <div className="text-3xl font-black text-amber-300">{hud.kills}</div>
        <div className="text-[10px] font-bold tracking-widest text-white/70">KILLS</div>
      </div>

      {hud.reloading && (
        <div className="absolute left-1/2 top-[58%] -translate-x-1/2 text-sm font-bold text-amber-300">RELOADING...</div>
      )}

      {/* bottom hotbar (hidden on mobile, replaced by touch wheel) */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
        <div className="mb-2 flex items-end justify-center gap-2">
          <span className="text-base font-black tracking-wide text-white drop-shadow md:text-lg">{w.name}</span>
          {(w.type === "auto" || w.type === "semi") && (
            <span className="text-lg font-black text-amber-300 md:text-xl">
              {hud.ammo[hud.weaponIndex].clip}
              <span className="text-sm text-white/60"> / {hud.ammo[hud.weaponIndex].reserve}</span>
            </span>
          )}
        </div>
        {!mobile && (
          <div className="flex gap-1.5 rounded-xl border border-white/10 bg-black/55 p-2 backdrop-blur">
            {WEAPONS.map((weap, i) => {
              const active = i === hud.weaponIndex;
              const a = hud.ammo[i];
              const count =
                weap.type === "throw" || weap.type === "heal" || weap.type === "auto" || weap.type === "semi"
                  ? a.clip
                  : null;
              return (
                <button
                  key={weap.id}
                  onClick={() => game?.setWeapon(i)}
                  className={`pointer-events-auto relative flex h-16 w-20 flex-col items-center justify-center rounded-lg border-2 transition ${
                    active
                      ? "border-amber-400 bg-amber-400/15 shadow-[0_0_12px_rgba(251,191,36,0.4)]"
                      : "border-white/15 bg-white/5 hover:border-white/40"
                  }`}
                >
                  <span className="absolute left-1 top-0.5 text-[10px] font-bold text-white/50">{i + 1}</span>
                  <span className="text-2xl leading-none">{WEAPON_ICONS[i]}</span>
                  <span className="mt-0.5 text-[9px] font-bold tracking-wide text-white/80">{weap.name}</span>
                  {count !== null && <span className="absolute bottom-0.5 right-1 text-[10px] font-bold text-amber-300">{count}</span>}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {!mobile && (
        <div className="absolute bottom-4 left-4 text-[11px] leading-relaxed text-white/50">
          <div><b className="text-white/80">WASD</b> Move · <b className="text-white/80">SPACE</b> Jetpack</div>
          <div><b className="text-white/80">MOUSE</b> Aim · <b className="text-white/80">CLICK</b> Fire</div>
          <div><b className="text-white/80">R</b> Reload · <b className="text-white/80">1-6</b> Weapons · <b className="text-white/80">V</b> Melee · <b className="text-white/80">ESC</b> Pause</div>
        </div>
      )}
    </div>
  );
}

function PlayerChip() {
  return (
    <div className="flex h-12 w-12 flex-col items-center justify-center rounded-lg border border-white/20 bg-black/50 backdrop-blur">
      <span className="text-2xl">🧑‍✈️</span>
    </div>
  );
}

function Bar({ label, value, max, color, text }: { label: string; value: number; max: number; color: string; text: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-5 text-center text-sm">{label}</span>
      <div className="relative h-4 flex-1 overflow-hidden rounded-md border border-white/20 bg-black/50">
        <div className={`h-full bg-gradient-to-r ${color} transition-all`} style={{ width: `${(value / max) * 100}%` }} />
        <span className="absolute inset-0 flex items-center justify-center text-[11px] font-bold text-white drop-shadow">{text}</span>
      </div>
    </div>
  );
}

/* ----------------------------- Rotate prompt ----------------------------- */
function RotatePrompt() {
  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-slate-950 text-white">
      <div className="animate-bounce text-6xl">📱↻</div>
      <p className="mt-4 text-xl font-black">ROTATE YOUR DEVICE</p>
      <p className="mt-1 text-sm text-white/60">This game is best played in landscape.</p>
    </div>
  );
}

/* ----------------------------- Menu ----------------------------- */
function MenuScreen({ onStart, onOpenSettings, mobile }: { onStart: () => void; onOpenSettings: () => void; mobile: boolean }) {
  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-sky-400 via-sky-600 to-emerald-900">
      <div className="pointer-events-none absolute inset-0 opacity-40">
        {Array.from({ length: 30 }).map((_, i) => (
          <div
            key={i}
            className="absolute rounded-sm bg-white/40"
            style={{
              left: `${(i * 37) % 100}%`,
              top: `${(i * 53) % 100}%`,
              width: `${10 + (i % 5) * 8}px`,
              height: `${10 + (i % 5) * 8}px`,
              transform: `rotate(${i * 20}deg)`,
              animation: `float ${4 + (i % 5)}s ease-in-out ${i * 0.2}s infinite alternate`,
            }}
          />
        ))}
      </div>
      <style>{`@keyframes float{from{transform:translateY(0) rotate(0)}to{transform:translateY(-24px) rotate(20deg)}}`}</style>

      <div className="relative z-10 flex flex-col items-center px-6 text-center">
        <div className="mb-2 rounded-md bg-black/30 px-4 py-1 text-xs font-bold tracking-[0.3em] text-amber-300">
          3D BLOCK BATTLE ROYALE
        </div>
        <h1 className="text-5xl font-black tracking-tight text-white drop-shadow-[0_4px_0_rgba(0,0,0,0.4)] md:text-8xl">
          MILK <span className="text-amber-300">MILI</span> TIA
        </h1>
        <p className="mt-3 max-w-md text-sm font-medium text-white/90 md:text-base">
          Strap on your jetpack, grab the AK-47, and be the last block standing as the safe zone closes in.
        </p>

        <div className="mt-7 flex w-64 flex-col gap-3">
          <MenuButton onClick={onStart} color="amber">▶ DEPLOY</MenuButton>
          <MenuButton onClick={onOpenSettings} color="slate">⚙ SETTINGS</MenuButton>
        </div>

        <div className="mt-7 grid max-w-2xl grid-cols-2 gap-3 text-left text-xs text-white/90 md:grid-cols-3">
          {(mobile
            ? [
                ["🕹️", "Left stick: move"],
                ["👆", "Right side: aim"],
                ["🔥", "Fire button"],
                ["🚀", "Jetpack button"],
                ["🔄", "Reload button"],
                ["⚠️", "Stay in zone"],
              ]
            : [
                ["🎮", "WASD to move"],
                ["🚀", "SPACE jetpack"],
                ["🖱️", "Click to shoot"],
                ["🔫", "1-6 swap guns"],
                ["🩹", "Slot 4 heals"],
                ["⚠️", "Stay in zone"],
              ]
          ).map(([icon, txt]) => (
            <div key={txt} className="flex items-center gap-2 rounded-lg bg-black/25 px-3 py-2 backdrop-blur">
              <span className="text-lg">{icon}</span>
              <span className="font-semibold">{txt}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ----------------------------- End ----------------------------- */
function EndScreen({ win, kills, onRestart, onMenu }: { win: boolean; kills: number; onRestart: () => void; onMenu: () => void }) {
  return (
    <div className={`flex h-full w-full flex-col items-center justify-center bg-gradient-to-b ${win ? "from-amber-500 to-amber-900" : "from-slate-700 to-slate-950"}`}>
      <div className="text-center">
        <div className="text-7xl">{win ? "🏆" : "💀"}</div>
        <h1 className="mt-4 text-4xl font-black tracking-tight text-white drop-shadow md:text-7xl">
          {win ? "VICTORY ROYALE!" : "ELIMINATED"}
        </h1>
        <p className="mt-2 text-base font-semibold text-white/80 md:text-lg">
          {win ? "Last block standing — you cleared the lobby!" : "Better luck next drop, soldier."}
        </p>
        <div className="mt-6 inline-flex items-center gap-2 rounded-lg bg-black/30 px-6 py-3">
          <span className="text-3xl font-black text-amber-300">{kills}</span>
          <span className="text-sm font-bold tracking-widest text-white/70">ELIMINATIONS</span>
        </div>
        <div className="mt-8 flex justify-center gap-4">
          <div className="w-40"><MenuButton onClick={onRestart} color="emerald">↻ REDEPLOY</MenuButton></div>
          <div className="w-40"><MenuButton onClick={onMenu} color="slate">⌂ MENU</MenuButton></div>
        </div>
      </div>
    </div>
  );
}
