export interface HudButton {
  x:number;
  y:number;
  scale:number;
}

export interface HudLayout {
  fire:HudButton;
  jump:HudButton;
  reload:HudButton;
  sprint:HudButton;
  slide:HudButton;
  ads:HudButton;
}

export const DEFAULT_LAYOUT:HudLayout = {
  fire:{x:88,y:70,scale:1},
  jump:{x:80,y:45,scale:1},
  reload:{x:70,y:60,scale:1},
  sprint:{x:20,y:40,scale:1},
  slide:{x:30,y:40,scale:1},
  ads:{x:75,y:70,scale:1}
};

const KEY="blockfront_hud";

export function loadHud(){
  try{
    const raw=localStorage.getItem(KEY);
    if(raw){
      return {
        ...DEFAULT_LAYOUT,
        ...JSON.parse(raw)
      };
    }
  }catch{}

  return DEFAULT_LAYOUT;
}

export function saveHud(layout:HudLayout){
  localStorage.setItem(
    KEY,
    JSON.stringify(layout)
  );
}
