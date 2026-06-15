import type { Settings, ControlMode, Difficulty } from "./settings";
import type { Quality } from "./game/engine";

export function SettingsPanel({
  settings,
  onChange,
  onClose,
  title = "SETTINGS",
}: {
  settings: Settings;
  onChange: (s: Settings) => void;
  onClose: () => void;
  title?: string;
}) {
  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => onChange({ ...settings, [k]: v });

  return (
    <div className="w-full max-w-md rounded-2xl border border-white/15 bg-slate-900/90 p-6 text-white shadow-2xl backdrop-blur">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-2xl font-black tracking-wide">⚙ {title}</h2>
        <button
          onClick={onClose}
          className="rounded-lg border border-white/20 bg-white/5 px-3 py-1 text-sm font-bold hover:bg-white/15"
        >
          ✕
        </button>
      </div>

      {/* Sensitivity */}
      <div className="mb-5">
        <div className="mb-1 flex justify-between text-sm font-bold">
          <span>Look Sensitivity</span>
          <span className="text-amber-300">{settings.sensitivity.toFixed(2)}×</span>
        </div>
        <input
          type="range"
          min={0.3}
          max={2.5}
          step={0.05}
          value={settings.sensitivity}
          onChange={(e) => set("sensitivity", parseFloat(e.target.value))}
          className="w-full accent-amber-400"
        />
      </div>

      {/* Quality */}
      <Segmented<Quality>
        label="Graphics Quality"
        value={settings.quality}
        options={[
          ["low", "Low"],
          ["medium", "Medium"],
          ["high", "High"],
        ]}
        onChange={(v) => set("quality", v)}
      />

      {/* Controls */}
      <Segmented<ControlMode>
        label="Controls"
        value={settings.controls}
        options={[
          ["auto", "Auto"],
          ["touch", "Touch"],
          ["keyboard", "KB / Mouse"],
        ]}
        onChange={(v) => set("controls", v)}
      />

      {/* Difficulty */}
      <Segmented<Difficulty>
        label="Difficulty"
        value={settings.difficulty}
        options={[
          ["recruit", "Recruit"],
          ["soldier", "Soldier"],
          ["veteran", "Veteran"],
        ]}
        onChange={(v) => set("difficulty", v)}
      />

      <button
        onClick={onClose}
        className="mt-4 w-full rounded-xl border-b-4 border-amber-700 bg-gradient-to-b from-amber-300 to-amber-500 py-3 text-lg font-black text-amber-950 active:translate-y-0.5 active:border-b-2"
      >
        DONE
      </button>
    </div>
  );
}

function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: [T, string][];
  onChange: (v: T) => void;
}) {
  return (
    <div className="mb-5">
      <div className="mb-1.5 text-sm font-bold">{label}</div>
      <div className="flex gap-1.5 rounded-lg bg-black/40 p-1">
        {options.map(([val, lbl]) => (
          <button
            key={val}
            onClick={() => onChange(val)}
            className={`flex-1 rounded-md px-2 py-2 text-sm font-bold transition ${
              value === val ? "bg-amber-400 text-amber-950" : "text-white/70 hover:bg-white/10"
            }`}
          >
            {lbl}
          </button>
        ))}
      </div>
    </div>
  );
}
