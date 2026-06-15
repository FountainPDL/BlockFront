export interface DailyMission {

  id:string;

  title:string;

  target:number;

  progress:number;

  reward:number;
}

export const DAILY_MISSIONS:DailyMission[]=[

  {
    id:"kills",
    title:"Get 10 Kills",
    target:10,
    progress:0,
    reward:100
  },

  {
    id:"wins",
    title:"Win 1 Match",
    target:1,
    progress:0,
    reward:200
  },

  {
    id:"damage",
    title:"Deal 1000 Damage",
    target:1000,
    progress:0,
    reward:150
  }
];
