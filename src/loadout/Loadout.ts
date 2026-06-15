export interface WeaponAttachment {
  optic?: string;
  muzzle?: string;
  grip?: string;
  magazine?: string;
}

export interface WeaponSlot {
  weaponId:string;
  attachments:WeaponAttachment;
}

export interface Loadout {
  primary:WeaponSlot;
  secondary:WeaponSlot;
  melee:string;
  grenade:string;
}

export const DEFAULT_LOADOUT:Loadout = {
  primary:{
    weaponId:"rifle",
    attachments:{}
  },
  secondary:{
    weaponId:"pistol",
    attachments:{}
  },
  melee:"knife",
  grenade:"frag"
};
