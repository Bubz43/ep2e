import {
  AptitudeType,
  enumValues,
  PoolEffectUsability,
  PoolType,
  RechargeType,
} from '@src/data-enums';
import { localize } from '@src/foundry/localization';
import { healthLabels, HealthStat, HealthType } from '@src/health/health';
import { formatAutoHealing, HealOverTimeTarget } from '@src/health/recovery';
import { nonNegative, notEmpty, withSign } from '@src/utility/helpers';
import { anyPass, clamp, compact, createPipe, map, purry } from 'remeda';
import type { Action, ActionSubtype } from './actions';
import { ArmorType } from './active-armor';
import { createFeature } from './feature-helpers';
import { Movement, MovementRate } from './movement';
import type { RepBase, RepWithIdentifier } from './reputations';
import {
  ActiveSkillCategory,
  CommonPilotField,
  fieldSkillInfo,
  fieldSkillName,
  FieldSkillType,
  isFieldSkill,
  KnowSkillCategory,
  Skill,
  skillInfo,
  SkillType,
} from './skills';
import { formatEffectTags, SpecialTest, Tag, TagType } from './tags';
import { CommonInterval, prettyMilliseconds } from './time';

export enum UniqueEffectType {
  NoFlipFlop = 'noFlipFlop',
  HalveDrugEffects = 'halveDrugEffects',
  // AllowRemoteControl = 'allowRemoteControl',
  // Modular = 'modular',
}

export enum DurationEffectTarget {
  EffectDuration = 'effectDuration',
  TaskActionTimeframe = 'taskActionTimeframe',
  Drugs = 'drugOrToxin',
  HealingTimeframes = 'healingTimeframes',
}

export enum EffectType {
  Armor = 'armor',
  Duration = 'duration',
  Health = 'health',
  HealthRecovery = 'healthRecovery',
  Initiative = 'initiative',
  Melee = 'melee',
  Misc = 'misc',
  Movement = 'movement',
  Pool = 'pool',
  Ranged = 'ranged',
  Recharge = 'recharge',
  Skill = 'skill',
  SuccessTest = 'successTest',
  // TODO Vision MISC
  // TODO Limb / add extra/convert existing to prehensile
}

export type InitiativeEffect = {
  type: EffectType.Initiative;
  modifier: number;
};

export type PoolEffect = {
  type: EffectType.Pool;
  pool: Exclude<PoolType, PoolType.Threat>;
  modifier: number;
  usabilityModification: '' | PoolEffectUsability;
};

export type SuccessTestEffect = {
  type: EffectType.SuccessTest;
  tags: Tag[];
  modifier: number;
  requirement: string;
  toOpponent: boolean;
};

export type MiscEffect = {
  type: EffectType.Misc;
  unique: '' | UniqueEffectType;
  description: string;
};

export type HealthEffect = {
  type: EffectType.Health;
  health: HealthType;
  stat: HealthStat;
  modifier: number;
};

// TODO: Collision bonus
export type MeleeEffect = {
  type: EffectType.Melee;
  dvModifier: string;
  reachBonus?: number;
  armorPiercing?: boolean;
};

export type RangedEffect = {
  type: EffectType.Ranged;
  negativeRangeModifiersMultiplier: number;
};

export type HealthRecoveryEffect = {
  interval: number;
  healthType?: HealthType;
  damageAmount: string;
  woundAmount: number;
  stat: HealOverTimeTarget;
  technologicallyAided: boolean;
  type: EffectType.HealthRecovery;
};

export type ArmorEffect = Record<ArmorType, number> & {
  type: EffectType.Armor;
  layerable: boolean;
  concealable: boolean;
};

export type DurationEffect = {
  type: EffectType.Duration;
  subtype: DurationEffectTarget;
  /**
   * @min -100
   * @max 200
   */
  modifier: number;
  taskType: ActionSubtype | '';
  cummulative?: boolean;
};

export enum RechargeStat {
  MaxUses = 'maxUses',
  Duration = 'duration',
  PoolsRecovered = 'poolsRecovered',
}

export type RechargeEffect = {
  type: EffectType.Recharge;
  recharge: RechargeType;
  stat: RechargeStat;
  modifier: number;
};

export type SkillEffect = {
  skillType: SkillType | FieldSkillType;
  field: string;
  specialization: string;
  type: EffectType.Skill;
  /**
   * @deprecated - Have to continue to check for it to know if aptitude multiplier should be 0
   * Total is now points
   */
  total: number;
  aptitudeMultiplier: number;
  linkedAptitude: AptitudeType;
  category?: ActiveSkillCategory | KnowSkillCategory;
  points?: number;
};

export enum MovementEffectMode {
  Grant = 'grant',
  Modify = 'modify',
}

export type MovementEffect = Omit<MovementRate, 'type'> & {
  type: EffectType.Movement;
  movementType: Movement;
  mode: MovementEffectMode;
  skill?: SkillType | CommonPilotField | '';
};

export type MovementEffectsInfo = {
  modify: SourcedEffect<MovementEffect>[];
  baseModification: number;
  fullModification: number;
};

export type Effect =
  | InitiativeEffect
  | PoolEffect
  | MiscEffect
  | SuccessTestEffect
  | HealthEffect
  | ArmorEffect
  | RechargeEffect
  | DurationEffect
  | HealthRecoveryEffect
  | MeleeEffect
  | RangedEffect
  | SkillEffect
  | MovementEffect;

export type Effects = {
  [key in EffectType]: Extract<Effect, { type: key }>;
};

export const Source = Symbol();

export type SourcedEffect<T extends {}> = T & { [Source]: string };

export const isFieldSkillEffect = (
  skillType: SkillEffect['skillType'],
): skillType is FieldSkillType =>
  enumValues(FieldSkillType).some((type) => type === skillType);

const skill = createFeature<SkillEffect>((data) => ({
  type: EffectType.Skill,
  field: '',
  specialization: '',
  skillType: SkillType.Psi,
  aptitudeMultiplier: 1,
  total: 0,
  linkedAptitude: AptitudeType.Willpower,
  category:
    data.category ||
    (data.skillType
      ? isFieldSkillEffect(data.skillType)
        ? fieldSkillInfo[data.skillType].categories[0] ||
          (data.skillType === FieldSkillType.Know
            ? KnowSkillCategory.Academics
            : ActiveSkillCategory.Misc)
        : skillInfo[data.skillType].category
      : ActiveSkillCategory.Mental),
  points: 0,
}));

const duration = createFeature<DurationEffect>(() => ({
  type: EffectType.Duration,
  subtype: DurationEffectTarget.EffectDuration,
  modifier: 0,
  taskType: '',
  cummulative: false,
  halve: false,
}));

const recharge = createFeature<RechargeEffect>(() => ({
  type: EffectType.Recharge,
  recharge: RechargeType.Short,
  stat: RechargeStat.PoolsRecovered,
  modifier: 1,
}));

const pool = createFeature<PoolEffect>(() => ({
  type: EffectType.Pool,
  pool: PoolType.Insight,
  modifier: 1,
  usabilityModification: '',
}));

const initiative = createFeature<InitiativeEffect>(() => ({
  type: EffectType.Initiative,
  modifier: 1,
}));

const misc = createFeature<MiscEffect>(() => ({
  type: EffectType.Misc,
  unique: '',
  description: '',
}));

const melee = createFeature<MeleeEffect>(() => ({
  type: EffectType.Melee,
  dvModifier: '',
  reachBonus: 0,
  armorPiercing: false,
}));

const ranged = createFeature<RangedEffect>(() => ({
  type: EffectType.Ranged,
  negativeRangeModifiersMultiplier: 1,
}));

const successTest = createFeature<SuccessTestEffect>(() => ({
  type: EffectType.SuccessTest,
  tags: [],
  modifier: 0,
  toOpponent: false,
  requirement: '',
}));

const health = createFeature<HealthEffect>(() => ({
  type: EffectType.Health,
  health: HealthType.Physical,
  stat: HealthStat.WoundsIgnored,
  modifier: 1,
}));

const armor = createFeature<ArmorEffect>(() => ({
  type: EffectType.Armor,
  energy: 0,
  kinetic: 0,
  mental: 0,
  mesh: 0,
  layerable: false,
  concealable: false,
}));

const healthRecovery = createFeature<HealthRecoveryEffect>(() => ({
  healthType: HealthType.Physical,
  type: EffectType.HealthRecovery,
  damageAmount: '1d10',
  woundAmount: 1,
  interval: CommonInterval.Hour,
  stat: HealOverTimeTarget.Damage,
  technologicallyAided: true,
}));

const movement = createFeature<MovementEffect>(
  () => ({
    type: EffectType.Movement,
    base: 0,
    full: 0,
    movementType: Movement.Walker,
    mode: MovementEffectMode.Modify,
    skill: '',
  }),
  (effect) => {
    if (effect.mode === MovementEffectMode.Grant) {
      effect.base = clamp(effect.base, { min: 1 });
      effect.full = clamp(effect.full, { min: 1 });
    }
    return effect;
  },
);

export const createEffect = Object.freeze({
  pool,
  initiative,
  misc,
  successTest,
  health,
  healthRecovery,
  armor,
  recharge,
  duration,
  melee,
  ranged,
  skill,
  movement,
});

const format = (effect: Effect): (string | number)[] => {
  switch (effect.type) {
    case EffectType.Initiative:
      return [withSign(effect.modifier), localize(effect.type)];

    case EffectType.Pool: {
      const disable =
        effect.usabilityModification === PoolEffectUsability.Disable;
      return [
        !disable && effect.modifier
          ? withSign(effect.modifier)
          : disable
          ? localize('disable')
          : '',
        `${localize(effect.pool)}${
          effect.usabilityModification === PoolEffectUsability.UsableTwice
            ? `, ${localize('usableTwice')} ${localize('onTest')}`
            : ''
        }`,
      ];
    }

    case EffectType.Misc:
      return [
        effect.unique ? `[${localize(effect.unique)}]` : '',
        effect.description,
      ];

    case EffectType.SuccessTest:
      return [
        withSign(effect.modifier),
        localize('to'),
        effect.toOpponent ? localize("opponent's") : '',
        formatEffectTags(effect.tags),
        effect.requirement &&
          `${localize('when').toLocaleLowerCase()} ${effect.requirement}`,
      ];
    case EffectType.Health:
      return [
        withSign(effect.modifier),
        localize('to'),
        effect.health === HealthType.Mental ? '' : localize(effect.health),
        healthLabels(effect.health, effect.stat),
      ];
    case EffectType.HealthRecovery: {
      const amount =
        effect.stat === HealOverTimeTarget.Damage
          ? effect.damageAmount
          : effect.woundAmount;
      const isPhysical =
        !effect.healthType || effect.healthType === HealthType.Physical;
      return [
        isPhysical ? '' : localize(effect.healthType!),
        effect.healthType === HealthType.Mental
          ? `${localize(
              effect.stat === HealOverTimeTarget.Damage ? 'stress' : 'trauma',
            )} ${localize('heal')}:`
          : `${localize(effect.stat)}:`,
        formatAutoHealing({ amount, interval: effect.interval }),
        effect.technologicallyAided ? `[${localize('tech')}]` : '',
      ];
    }

    case EffectType.Armor:
      return [
        enumValues(ArmorType)
          .flatMap((armor) => {
            const value = effect[armor];
            return value
              ? `${localize(armor)} ${localize('armor')} ${
                  effect.layerable ? withSign(value) : value
                }`
              : [];
          })
          .join(', '),
        effect.concealable ? `(${localize('concealable')})` : '',
      ];

    case EffectType.Recharge:
      return [
        `${localize(effect.recharge)}:`,
        localize(effect.stat),
        effect.stat === RechargeStat.Duration
          ? prettyMilliseconds(effect.modifier)
          : withSign(effect.modifier),
      ];
    case EffectType.Duration:
      return [
        effect.subtype === DurationEffectTarget.TaskActionTimeframe
          ? localize(effect.taskType || 'all')
          : '',
        localize(effect.subtype),
        localize('duration'),
        formatDurationPercentage(effect.modifier),
        effect.cummulative ? `(${localize('cumulative')})` : '',
      ];

    case EffectType.Melee: {
      const dv =
        effect.dvModifier &&
        [
          effect.dvModifier,
          localize('SHORT', 'damageValue'),
          localize('to'),
          localize('meleeDamageRolls'),
        ].join(' ');
      const reach =
        effect.reachBonus &&
        `${withSign(effect.reachBonus)} ${localize('reach')}`;
      return [
        compact([
          dv,
          reach,
          effect.armorPiercing && localize('meleeDamageArmorPiercing'),
        ]).join(' - '),
      ];
    }

    case EffectType.Ranged:
      return [
        ...map(['range', 'negative', 'modifiers'], localize),
        'x',
        String(effect.negativeRangeModifiersMultiplier),
      ];

    case EffectType.Skill: {
      const baseName = isFieldSkillEffect(effect.skillType)
        ? fieldSkillName({
            fieldSkill: effect.skillType,
            field: effect.field || '--',
          })
        : localize(effect.skillType);
      const value = effect.total || effect.points || 0;
      return [
        baseName + (effect.specialization ? ` (${effect.specialization})` : ''),
        value,
        ` ${value ? '+' : '@'} ${localize(effect.linkedAptitude)} x${
          effect.aptitudeMultiplier
        }`,
      ];
    }

    case EffectType.Movement: {
      return [
        localize(effect.mode),
        localize(effect.movementType),
        effect.mode === MovementEffectMode.Modify
          ? `${localize('by').toLocaleLowerCase()}  (${withSign(
              effect.base,
            )} / ${withSign(effect.full)})`
          : `(${effect.base} / ${effect.full})`,
        effect.skill && effect.mode === MovementEffectMode.Grant
          ? `${localize(`use`)} ${
              enumValues(SkillType).includes(effect.skill as SkillType)
                ? localize(effect.skill)
                : `${localize('pilot')}: ${localize(effect.skill)}`
            }`
          : ``,
      ];
    }
  }
};

export const formatDurationPercentage = (modifier: number) => {
  return `${localize(modifier < 0 ? 'reduced' : 'increased')} ${localize(
    'by',
  )} ${Math.abs(modifier)}%`.toLocaleLowerCase();
};

export const durationEffectMultiplier = (modifier: number) => {
  return nonNegative(1 + modifier / 100);
};

export const extractDurationEffectMultipliers = (
  effects: DurationEffect[],
  ...additionalCummulative: number[]
) => {
  const multipliers: number[] = [];
  const cummulative = [...additionalCummulative];

  for (const effect of effects) {
    if (effect.modifier) {
      if (effect.cummulative) cummulative.push(effect.modifier);
      else multipliers.push(durationEffectMultiplier(effect.modifier));
    }
  }

  if (notEmpty(cummulative)) {
    const cummulativeTotal = cummulative.reduce(
      (accum, mp) => (accum += mp),
      0,
    );
    if (cummulativeTotal)
      multipliers.push(durationEffectMultiplier(cummulativeTotal));
  }

  return multipliers;
};

export const applyDurationMultipliers = ({
  duration,
  multipliers,
}: {
  duration: number;
  multipliers: number[];
}) => {
  return Math.ceil(multipliers.reduce((accum, mp) => accum * mp, duration));
};

export const formatEffect = createPipe(
  format,
  compact,
  (formatted) => formatted.join(' ').trim() || '-',
);

export function matchesAction(tag: Tag, action: Action): boolean;
export function matchesAction(action: Action): (tag: Tag) => boolean;
export function matchesAction() {
  // eslint-disable-next-line prefer-rest-params
  return purry(_matchesAction, arguments);
}

const _matchesAction = (tag: Tag, action: Action) => {
  return (
    tag.type === TagType.AllActions ||
    (tag.type === TagType.Action &&
      (!tag.action || tag.action === action.type) &&
      (!tag.subtype || tag.subtype === action.subtype))
  );
};

const anyEffectTagPasses = (...checks: ((tag: Tag) => boolean)[]) => {
  return ({ tags }: SuccessTestEffect) => tags.some(anyPass(checks));
};

export const matchAllEffects = (action: Action) => () => true;

export const matchesAptitude =
  (aptitude: AptitudeType, special?: SpecialTest) => (action: Action) => {
    return anyEffectTagPasses(
      matchesAction(action),
      (tag) => tag.type === TagType.AptitudeChecks && tag.aptitude === aptitude,
      (tag) =>
        !!(special && tag.type === TagType.Special) && tag.test === special,
    );
  };

export const matchesRep = (rep: RepWithIdentifier) => (action: Action) => {
  const network =
    rep.identifier.type === 'ego' ? rep.identifier.networkId : null;
  return anyEffectTagPasses(
    matchesAction(action),
    (tag) => tag.type === TagType.Rep && network === tag.network,
  );
};

export const matchesSkill = (skill: Skill) => (action: Action) => {
  return anyEffectTagPasses(matchesAction(action), (tag) => {
    switch (tag.type) {
      case TagType.SkillCategory:
        return skill.category === tag.category;

      case TagType.FieldSkill:
        return (
          isFieldSkill(skill) &&
          skill.fieldSkill === tag.fieldSkill &&
          (!tag.field ||
            skill.field.toLocaleLowerCase() === tag.field.toLocaleLowerCase())
        );

      case TagType.Skill:
        return !isFieldSkill(skill) && skill.skill === tag.skillType;

      case TagType.LinkedAptitude:
        return skill.linkedAptitude === tag.aptitude;

      default:
        return false;
    }
  });
};

export const multiplyEffectModifier = <T extends Effect>(
  effect: T,
  multiplier: number,
): T => {
  const e = effect as Effect;
  if (e.type === EffectType.Armor) {
    const copy = { ...effect } as ArmorEffect;
    for (const armor of enumValues(ArmorType)) {
      copy[armor] = Math.ceil(copy[armor] * multiplier);
    }
    return copy as T;
  } else if ('modifier' in e && e.modifier) {
    return { ...effect, modifier: Math.ceil(e.modifier * multiplier) };
  }
  return effect;
};

export const totalModifiers = <T extends { modifier: number }>(
  effects: readonly T[],
) => effects.reduce((accum, { modifier }) => accum + modifier, 0);
