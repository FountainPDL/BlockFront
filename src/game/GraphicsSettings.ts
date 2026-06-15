export interface GraphicsSettings {

  renderDistance:number;

  shadowQuality:number;

  particleQuality:number;

  fpsLimit:number;

  bloom:boolean;

  shadows:boolean;

  particles:boolean;
}

export const DEFAULT_GRAPHICS:GraphicsSettings={

  renderDistance:1000,

  shadowQuality:2,

  particleQuality:2,

  fpsLimit:60,

  bloom:true,

  shadows:true,

  particles:true
};
