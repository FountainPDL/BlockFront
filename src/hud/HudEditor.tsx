import { loadHud } from "./HudStorage";

export function HudEditor() {
  const hud = loadHud();

  return (
    <div className="p-6 text-white">
      <h2 className="mb-4 text-2xl font-black">
        CUSTOM HUD
      </h2>

      <pre className="rounded bg-black/40 p-4">
        {JSON.stringify(hud,null,2)}
      </pre>

      <div className="mt-4 text-sm text-white/70">
        Drag-and-drop editor coming next pass.
      </div>
    </div>
  );
}
