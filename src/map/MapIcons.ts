export interface MapIcon {
  id:string;
  x:number;
  y:number;
  type:
    | "enemy"
    | "ally"
    | "loot"
    | "objective";
}
