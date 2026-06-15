export interface WeaponXP {

  weapon:string;

  level:number;

  xp:number;
}

export function addWeaponXP(
  data:WeaponXP,
  amount:number
){

  data.xp+=amount;

  while(data.xp>=100){

    data.xp-=100;

    data.level++;
  }

  return data;
}
