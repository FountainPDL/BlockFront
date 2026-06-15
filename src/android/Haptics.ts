export function vibrate(ms:number){

  try{

    const native=(window as any).Android;

    if(native?.vibrate){
      native.vibrate(ms);
      return;
    }

    navigator.vibrate?.(ms);

  }catch{}
}
