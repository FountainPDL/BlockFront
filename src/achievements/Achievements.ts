export interface Achievement {

  id:string;

  name:string;

  unlocked:boolean;
}

export const ACHIEVEMENTS:Achievement[]=[

  {
    id:"first_kill",
    name:"First Blood",
    unlocked:false
  },

  {
    id:"winner",
    name:"Champion",
    unlocked:false
  },

  {
    id:"veteran",
    name:"Play 100 Matches",
    unlocked:false
  }
];
