export function MainMenu({
  play,
  settings,
  practice
}:{
  play:()=>void;
  settings:()=>void;
  practice:()=>void;
}){
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-4 bg-black text-white">

      <h1 className="text-6xl font-black">
        BLOCK FRONT
      </h1>

      <button onClick={play}>
        PLAY
      </button>

      <button onClick={practice}>
        PRACTICE
      </button>

      <button>
        LOADOUT
      </button>

      <button>
        OPERATORS
      </button>

      <button>
        PROFILE
      </button>

      <button onClick={settings}>
        SETTINGS
      </button>
    </div>
  );
}
