export interface OperatorAbility {

  id:string;

  name:string;

  cooldown:number;
}

export const OPERATOR_ABILITIES=[

  {
    id:"heal",
    name:"Combat Heal",
    cooldown:30
  },

  {
    id:"scan",
    name:"Enemy Scan",
    cooldown:45
  },

  {
    id:"dash",
    name:"Tactical Dash",
    cooldown:20
  }
];
