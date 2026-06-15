export interface BattlePassReward {

  level:number;

  reward:string;
}

export const BATTLE_PASS:BattlePassReward[]=[

  {
    level:1,
    reward:"100 Coins"
  },

  {
    level:5,
    reward:"Shadow Skin"
  },

  {
    level:10,
    reward:"Epic Rifle"
  }
];
