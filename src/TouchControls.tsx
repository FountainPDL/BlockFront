import { useRef } from "react";
import { Game } from "./game/engine";

interface Props{
  game:Game|null;
  weaponIndex:number;
}

export function TouchControls({
  game
}:Props){

  const lookRef=useRef<{
    x:number;
    y:number;
  }|null>(null);

  const moveRef=useRef<{
    x:number;
    y:number;
  }|null>(null);

  return (
    <>

      {/* MOVE STICK */}
      <div
        style={{
          position:"absolute",
          left:20,
          bottom:20,
          width:140,
          height:140,
          borderRadius:"50%",
          background:"rgba(255,255,255,.15)"
        }}
        onTouchStart={(e)=>{
          const t=e.touches[0];
          moveRef.current={
            x:t.clientX,
            y:t.clientY
          };
        }}
        onTouchMove={(e)=>{
          if(!moveRef.current||!game)return;

          const t=e.touches[0];

          const dx=
            (t.clientX-moveRef.current.x)/50;

          const dy=
            (t.clientY-moveRef.current.y)/50;

          game.setMove(
            Math.max(-1,Math.min(1,dx)),
            Math.max(-1,Math.min(1,dy))
          );
        }}
        onTouchEnd={()=>{
          game?.setMove(0,0);
        }}
      />

      {/* LOOK AREA */}
      <div
        style={{
          position:"absolute",
          right:0,
          top:0,
          width:"50%",
          height:"100%"
        }}
        onTouchStart={(e)=>{
          const t=e.touches[0];

          lookRef.current={
            x:t.clientX,
            y:t.clientY
          };
        }}
        onTouchMove={(e)=>{
          if(!lookRef.current||!game)return;

          const t=e.touches[0];

          const dx=
            t.clientX-lookRef.current.x;

          const dy=
            t.clientY-lookRef.current.y;

          game.look(dx,dy);

          lookRef.current={
            x:t.clientX,
            y:t.clientY
          };
        }}
      />

      {/* FIRE */}
      <button
        style={{
          position:"absolute",
          right:30,
          bottom:120,
          width:90,
          height:90,
          borderRadius:"50%"
        }}
        onTouchStart={()=>{
          game?.setFiring(true);
        }}
        onTouchEnd={()=>{
          game?.setFiring(false);
        }}
      >
        FIRE
      </button>

      {/* JETPACK */}
      <button
        style={{
          position:"absolute",
          right:140,
          bottom:220,
          width:70,
          height:70,
          borderRadius:"50%"
        }}
        onTouchStart={()=>{
          game?.setThrust(true);
        }}
        onTouchEnd={()=>{
          game?.setThrust(false);
        }}
      >
        🚀
      </button>

      {/* RELOAD */}
      <button
        style={{
          position:"absolute",
          right:140,
          bottom:120,
          width:70,
          height:70,
          borderRadius:"50%"
        }}
        onClick={()=>{
          game?.doReload();
        }}
      >
        R
      </button>

      {/* MELEE */}
      <button
        style={{
          position:"absolute",
          right:220,
          bottom:120,
          width:70,
          height:70,
          borderRadius:"50%"
        }}
        onClick={()=>{
          game?.doMelee();
        }}
      >
        🔪
      </button>

    </>
  );
}
