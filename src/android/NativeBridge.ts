declare global {
  interface Window {
    Android?: {
      vibrate(ms:number):void;
      getRam():number;
      getRefreshRate():number;
    };
  }
}

export const NativeBridge = {

  vibrate(ms:number){
    window.Android?.vibrate(ms);
  },

  getRam(){
    return window.Android?.getRam?.() ?? 0;
  },

  getRefreshRate(){
    return window.Android?.getRefreshRate?.() ?? 60;
  }
};
