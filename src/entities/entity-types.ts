export enum ActorType {
  Character = 'character',
  SyntheticShell = 'syntheticShell',
  Infomorph = 'infomorph',
  Biological = 'biological',
}

export const sleeveTypes = [
  ActorType.Biological,
  ActorType.SyntheticShell,
  ActorType.Infomorph,
] as const;

export enum ItemType {
  PhysicalTech = 'physicalTech',
  Trait = 'trait',
  Armor = 'armor',
  Psi = 'psi',
  Sleight = 'sleight',
  Substance = 'substance',
  Explosive = 'explosive',
  Software = 'software',
  MeleeWeapon = 'meleeWeapon',
  BeamWeapon = 'beamWeapon',
  Railgun = 'railgun',
  PhysicalService = 'physicalService',
  Firearm = 'firearm',
  FirearmAmmo = 'firearmAmmo',
  SprayWeapon = 'sprayWeapon',
  SeekerWeapon = 'seekerWeapon',
  ThrownWeapon = 'thrownWeapon',
}

export const equippableItemTypes = [
  ItemType.Armor,
  ItemType.Software,
  ItemType.MeleeWeapon,
  ItemType.PhysicalTech,
  ItemType.BeamWeapon,
  ItemType.Railgun,
  ItemType.Firearm,
  ItemType.SprayWeapon,
  ItemType.SeekerWeapon,
] as const;

export const inventoryItemTypes = [
  ...equippableItemTypes,
  ItemType.Substance,
  ItemType.Explosive,
  ItemType.FirearmAmmo,
  ItemType.ThrownWeapon,
] as const;
