export interface Rank {

  name:string;

  min:number;
}

export const RANKS:Rank[]=[

  {
    name:"Recruit",
    min:0
  },

  {
    name:"Private",
    min:100
  },

  {
    name:"Corporal",
    min:300
  },

  {
    name:"Sergeant",
    min:600
  },

  {
    name:"Captain",
    min:1200
  },

  {
    name:"Major",
    min:2500
  },

  {
    name:"General",
    min:5000
  }
];

export function getRank(
  xp:number
){

  let current=RANKS[0];

  for(const rank of RANKS){

    if(xp>=rank.min){

      current=rank;
    }
  }

  return current;
}
