export interface LootItem {

  id:string;

  rarity:string;
}

export const LOOT_TABLE:LootItem[]=[

  {
    id:"rifle",
    rarity:"common"
  },

  {
    id:"smg",
    rarity:"common"
  },

  {
    id:"sniper",
    rarity:"rare"
  },

  {
    id:"medkit",
    rarity:"common"
  },

  {
    id:"armor",
    rarity:"rare"
  }
];
