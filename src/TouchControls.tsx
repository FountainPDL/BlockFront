import { actions } from "./game/playerActions";

export function TouchControls() {
  return (
    <>
      <button
        className="absolute bottom-32 left-6 rounded bg-black/60 px-4 py-3 text-white"
        onTouchStart={() => (actions.sprint = true)}
        onTouchEnd={() => (actions.sprint = false)}
      >
        SPRINT
      </button>

      <button
        className="absolute bottom-20 left-28 rounded bg-black/60 px-4 py-3 text-white"
        onTouchStart={() => (actions.slide = true)}
      >
        SLIDE
      </button>

      <button
        className="absolute bottom-32 right-28 rounded bg-black/60 px-4 py-3 text-white"
        onTouchStart={() => (actions.ads = true)}
        onTouchEnd={() => (actions.ads = false)}
      >
        ADS
      </button>
    </>
  );
}
