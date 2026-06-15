export interface InventoryItem {
  id:string;
  name:string;
  rarity:string;
}

export const INVENTORY:InventoryItem[] = [
  {
    id:"skin_assault",
    name:"Assault Skin",
    rarity:"common"
  },
  {
    id:"skin_shadow",
    name:"Shadow Skin",
    rarity:"rare"
  }
];
