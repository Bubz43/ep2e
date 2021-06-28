import type { LangEntry } from './foundry/localization';

const valuedEnums = new WeakMap();
export const enumValues = <T extends Record<string, LangEntry>>(
  o: T,
): ReadonlyArray<T[keyof T]> => {
  let existing = valuedEnums.get(o);
  if (!existing) {
    existing = Object.freeze(Object.values(o));
    valuedEnums.set(o, existing);
  }
  return existing;
};

export enum Fork {
  Alpha = 'alpha',
  Beta = 'beta',
  Gamma = 'gamma',
}

export enum ThreatInfo {
  Classification = 'classification',
  Niche = 'niche',
  Numbers = 'numbers',
  StressValue = 'stressValue',
  MinStressValue = 'minStressValue',
  ThreatLevel = 'threatLevel',
}

export enum ThreatLevel {
  Yellow = 'yellow',
  Orange = 'orange',
  Red = 'red',
  Ultraviolet = 'ultraviolet',
}

export enum MinStressOption {
  None = 'none',
  Half = 'half',
  Value = 'value',
}

export enum EgoType {
  AGI = 'agi',
  ALI = 'ali',
  ASI = 'asi',
  Alien = 'alien',
  Exhuman = 'exhuman',
  Exsurgent = 'exsurgent',
  Neogenetic = 'neogenetic',
  Titan = 'titan',
  Transhuman = 'transhuman',
  Uplift = 'uplift',
  Xenofauna = 'xenofauna',
}

export enum CharacterDetail {
  Age = 'age',
  Aliases = 'aliases',
  Background = 'background',
  Career = 'career',
  Faction = 'faction',
  Gender = 'gender',
  Interest = 'interest',
  Languages = 'languages',
}

export enum AptitudeType {
  Cognition = 'cog',
  Intuition = 'int',
  Reflexes = 'ref',
  Savvy = 'sav',
  Somatics = 'som',
  Willpower = 'wil',
}

export enum PoolType {
  Insight = 'insight',
  Moxie = 'moxie',
  Vigor = 'vigor',
  Flex = 'flex',
  Threat = 'threat',
}

export enum MorphType {
  Biomorph = 'biomorph',
  Synthmorph = 'synthmorph',
  Pod = 'pod',
  // Vehicle = "vehicle",
  // Bot = "bot",
  // Swarm = "swarm",
  // Infomorph = "infomorph"
}

export enum BiologicalType {
  Biomorph = 'biomorph',
  Pod = 'pod',
  Create = 'creature',
}

export enum MorphCost {
  GearPoints = 'gearPoints',
  MorphPoints = 'morphPoints',
}

export enum Frame {
  Biological = 'biological',
  Robotic = 'robotic',
}

export enum Brain {
  Organic = 'organic',
  Synthetic = 'synthetic',
}

export enum Complexity {
  NoCost = 'noCost',
  Minor = 'minor',
  Moderate = 'moderate',
  Major = 'major',
  Rare = 'rare',
}

export enum RechargeType {
  Short = 'shortRecharge',
  Long = 'longRecharge',
}

export enum TraitSource {
  Ego = 'ego',
  Morph = 'morph',
}

export enum TraitType {
  Negative = 'negative',
  Positive = 'positive',
}

export enum Refresh {
  Daily = 'daily',
  Weekly = 'weekly',
  Arc = 'arc',
}

export enum PsiPush {
  ExtraTarget = 'extraTarget',
  IncreasedDuration = 'increasedDuration',
  IncreasedEffect = 'increasedEffect',
  IncreasedPenetration = 'increasedPenetration',
  IncreasedPower = 'increasedPower',
  IncreasedRange = 'increasedRange',
}

export enum SleightDuration {
  Instant = 'instant',
  Sustained = 'sustained',
  ActionTurns = 'actionTurns',
  Minutes = 'minutes',
  Hours = 'hours',
}

export enum SleightType {
  Chi = 'chi',
  Gamma = 'gamma',
  Epsilon = 'epsilon',
}

export enum SleightTarget {
  Self = 'self',
  BiologicalLife = 'biologicalLife',
  PsiUser = 'psiUser',
}

export enum PsiRange {
  Touch = 'touch',
  PointBlank = 'pointBlank',
  Close = 'close',
}

export enum SurpriseState {
  None = 'none',
  Alerted = 'alerted',
  Surprised = 'surprised',
}

export enum PhysicalWare {
  Bio = 'bioware',
  Cyber = 'cyberware',
  Hard = 'hardware',
  Nano = 'nanoware',
}

export enum GearQuality {
  TopOfTheLine = 'topOfTheLine',
  StateOfTheArt = 'stateOfTheArt',
  WellCrafted = 'wellCrafted',
  Average = 'average',
  Outdated = 'outdated',
  Shoddy = 'shoddy',
  InDisrepair = 'inDisrepair',
}

export enum BlueprintType {
  SingleUse = 'singleUse',
  LimitedUse = 'limitedUse',
  MultiUse = 'multiUse',
  OpenSource = 'openSource',
}

export enum DeviceType {
  Mote = 'mote',
  Host = 'host',
  Server = 'server',
}

export enum SoftwareType {
  App = 'app',
  AppAsService = 'appAsService',
  AppAsWare = 'appAsWare',
  MeshService = 'meshService',
  Meshware = 'meshware',
}

export enum Activation {
  None = 'none',
  Toggle = 'toggle',
  Use = 'use',
}

export enum GearTrait {
  Concealable = 'concealable',
  Fragile = 'fragile',
  SingleUse = 'singleUse',
  TwoHanded = 'twoHanded',
}

export enum RangedWeaponTrait {
  Fixed = 'fixed',
  Long = 'long',
  NoPointBlank = 'noPointBlank',
  NoClose = 'noClose',
}

export enum RangeRating {
  PointBlank = 'pointBlank',
  Close = 'close',
  Range = 'withinRange',
  BeyondRange = 'beyondRange',
}

export enum RangedWeaponAccessory {
  ArmSlide = 'armSlide',
  ExtendedMagazine = 'extendedMagazine',
  Gyromount = 'gyromount',
  ImagingScope = 'imagingScope',
  FlashSuppressor = 'flashSuppressor',
  LaserSight = 'laserSight',
  SafetySystem = 'safetySystem',
  ShockSafety = 'shockSafety',
  Silencer = 'silencer',
  Smartlink = 'smartlink',
  SmartMagazine = 'smartMagazine',
}

export enum AttackTrait {
  Blinding = 'blinding',
  Entangling = 'entangling',
  Knockdown = 'knockdown',
  Pain = 'pain',
  Shock = 'shock',
  Stun = 'stun',
}

export enum CharacterPoint {
  Rez = 'rez',
  Customization = 'customization',
  Morph = 'morph',
  Gear = 'gear',
  Credits = 'credits',
}

export enum EgoSetting {
  CanDefault = 'canDefault',
  TrackMentalHealth = 'trackMentalHealth',
  TrackPoints = 'trackPoints',
  TrackReputations = 'trackReputations',
  CharacterDetails = 'characterDetails',
  ThreatDetails = 'threatDetails',
  UseThreat = 'useThreat',
  IgnoreOverburdened = 'ignoreOverburdened',
}

export enum ShellType {
  SynthMorph = 'synthmorph',
  Vehicle = 'vehicle',
  Bot = 'bot',
}

export enum VehicleType {
  Aircraft = 'aircraft',
  Exoskeleton = 'exoskeleton',
  GroundCraft = 'groundcraft',
  Hardsuit = 'hardsuit',
  Hybrid = 'hybrid',
  NauticalCraft = 'nauticalCraft',
  PersonalTransportDevice = 'personalTransportDevice',
  Spacecraft = 'spacecraft',
}

export enum BotType {
  Combat = 'combat',
  Exploration = 'exploration',
  Medical = 'medical',
  Personal = 'personal',
  Recon = 'recon',
  Utility = 'utility',
}

export enum ShellHostType {
  ALI = 'aliOnly',
  Cyberbrain = 'cyberbrain',
}

export enum SubstanceType {
  Chemical = 'chemical',
  Drug = 'drug',
  Toxin = 'toxin',
}

export enum SubstanceClassification {
  Biochem = 'biochem',
  Nano = 'nano',
  Electronic = 'electronic',
}

export enum SubstanceApplicationMethod {
  Dermal = 'dermal',
  Inhalation = 'inhalation',
  Injected = 'injection',
  Oral = 'oral',
}

export enum DrugAddiction {
  Mental = 'mental',
  Physical = 'physical',
  Both = 'mental/physical',
}

export enum DrugCategory {
  Cognitive = 'cognitive',
  Combat = 'combat',
  Health = 'health',
  Nano = 'nanodrug',
  Narco = 'narcoalgorithm',
  Petal = 'petal',
  Psi = 'psi',
  Recreational = 'recreational',
  Social = 'social',
}

export enum ExplosiveSize {
  Micro = 'micro',
  Mini = 'mini',
  Standard = 'standard',
}

export enum ExplosiveType {
  Grenade = 'grenade',
  Missile = 'missile',
  Generic = 'generic',
}

export enum AreaEffectType {
  Uniform = 'uniform',
  Centered = 'centered',
  Cone = 'cone',
}

export enum CalledShot {
  BypassArmor = 'bypassArmor',
  Disarm = 'disarm',
  Knockdown = 'knockdown',
  Redirect = 'redirect',
  SpecificTarget = 'specificTarget',
}

export enum WeaponAttackType {
  Primary = 'primaryAttack',
  Secondary = 'secondaryAttack',
}

export enum PoolEffectUsability {
  UsableTwice = 'usableTwice',
  Disable = 'disable',
}

export enum PhysicalServiceType {
  Generic = 'generic',
  FakeId = 'fakeEgoId',
}

export enum KineticWeaponClass {
  HoldoutPistol = 'holdoutPistol',
  MediumPistol = 'mediumPistol',
  HeavyPistol = 'heavyPistol',
  MachinePistol = 'machinePistol',
  SubmachineGun = 'submachineGun',
  AssaultRifle = 'assaultRifle',
  BattleRifle = 'battleRifle',
  MachineGun = 'machineGun',
  SniperRifle = 'sniperRifle',
}

export enum FirearmAmmoModifierType {
  Formula = 'formula',
  Halve = 'halve',
  NoDamage = 'noDamage',
}

export enum SprayPayload {
  CoatAmmunition = 'coatAmmunition',
  FirePayload = 'firePayload',
}

export enum ExplosiveTrigger {
  Airburst = 'airburst',
  Impact = 'impact',
  Proximity = 'proximity',
  Signal = 'signal',
  Timer = 'timer',
}

export enum Demolition {
  DamageAgainsStructures = 'damageAgainstStructures',
  ShapeCentered = 'shape',
  StructuralWeakpoint = 'structuralWeakpoint',
  DisarmDifficulty = 'disarmDifficulty',
}

export enum FabType {
  Specialized = 'specialized',
  Gland = 'gland',
  General = 'general',
}

export enum EgoBackground {
  Colonist = 'colonist',
  Enclaver = 'enclaver',
  Freelancer = 'freelancer',
  Hyperelite = 'hyperelite',
  Indenture = 'indenture',
  Infolife = 'infolife',
  Isolate = 'isolate',
  Lost = 'lost',
  Underclass = 'underclass',
  Uplift = 'uplift',
}

export enum EgoCareer {
  Academic = 'academic',
  CovertOperative = 'covertOperative',
  Enforcer = 'enforcer',
  Explorer = 'explorer',
  Face = 'face',
  Generhacker = 'genehacker',
  Hacker = 'hacker',
  Investigator = 'investigator',
  Medic = 'medic',
  Mindhacker = 'mindhacker',
  Scavenger = 'scavenger',
  Scientist = 'scientist',
  Soldier = 'soldier',
  Techie = 'techie',
}

export enum EgoInterest {
  AnimalHandler = 'animalHandler',
  ArtistOrIcon = 'artist/icon',
  Async = 'async',
  Commander = 'commander',
  Fighter = 'fighter',
  ForensicSpecialists = 'forensicsSpecialist',
  JackOfAllTrades = 'jack-of-all-trades',
  Jammer = 'jammer',
  Networker = 'networker',
  Paramedic = 'paramedic',
  Pilot = 'pilot',
  Rogue = 'rogue',
  Slacker = 'slacker',
  Spacer = 'spacer',
  Student = 'student',
  Survivalist = 'survivalist',
}

export enum EgoFaction {
  Anarchist = 'anarchist',
  Argonaut = 'argonaut',
  Barsoomian = 'barsoomian',
  Brinker = 'brinker',
  Criminal = 'criminal',
  Extropian = 'extropian',
  Hypercorp = 'hypercorp',
  Jovian = 'jovian',
  LunarOrOrbital = 'lunar/orbital',
  Mercurial = 'mercurial',
  Reclaimer = 'reclaimer',
  Scum = 'scum',
  Socialite = 'socialite',
  Titanian = 'titanian',
  Venusian = 'venusian',
  Regional = 'regional',
}

export enum WeaponSkillOption {
  None = 'none',
  Exotic = 'exotic',
}

export enum ExsurgentStrain {
  Alter = 'alter',
  HauntingVirus = 'hauntingVirus',
  Mindstealer = 'mindstealer',
  Skrik = 'skrik',
  WattsMacleod = 'Watts-MacLeod',
  Whisper = 'whisper',
  Xenomorph = 'xenomorph',
}

export enum FullDefenseType {
  Physical = 'physical',
  Mental = 'mental',
}

export enum SuperiorResultEffect {
  Quality = 'quality',
  Quantity = 'quantity',
  Details = 'detail',
  Time = 'time',
  Covertness = 'covertness',
  Damage = 'damage',
}
