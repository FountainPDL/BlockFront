export interface Profile {

  name:string;

  xp:number;

  level:number;

  kills:number;

  deaths:number;

  wins:number;

  matches:number;
}

export const DEFAULT_PROFILE:Profile={

  name:"Player",

  xp:0,

  level:1,

  kills:0,

  deaths:0,

  wins:0,

  matches:0
};
