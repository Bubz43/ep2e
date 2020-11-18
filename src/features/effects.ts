import {
  AptitudeType,
  enumValues, PoolEffectUsability, PoolType,

  RechargeType
} from '@src/data-enums';
import { localize } from '@src/foundry/localization';
import { healthLabels, HealthStat, HealthType } from '@src/health/health';
import {
  DotOrHotTarget,
  formatAutoHealing
} from '@src/health/recovery';
import { withSign } from '@src/utility/helpers';
import { anyPass, clamp, compact, createPipe, map, purry } from 'remeda';
import type { Action, ActionSubtype } from './actions';
import { ArmorType } from './active-armor';
import { createFeature } from './feature-helpers';
import { Movement, MovementRate } from './movement';
import type { RepBase } from './reputations';
import {
  fieldSkillName, FieldSkillType,

  isFieldSkill,
  Skill, SkillType
} from './skills';
import { formatEffectTags, SpecialTest, Tag, TagType } from './tags';
import { CommonInterval, prettyMilliseconds } from './time';

export enum UniqueEffectType {
  NoFlipFlop = 'noFlipFlop',
  AllowRemoteControl = 'allowRemoteControl',
  Modular = 'modular',
}

export enum EffectType {
  Initiative = 'initiative',
  Pool = 'pool',
  Misc = 'misc',
  SuccessTest = 'successTest',
  Health = 'health',
  HealthRecovery = 'healthRecovery',
  Armor = 'armor',
  Recharge = 'recharge',
  Duration = 'duration',
  Melee = 'melee',
  Ranged = 'ranged',
  Skill = 'skill',
  Movement = 'movement',
  // TODO Unique Toggles (disable distracted, no flip-flop)
  // TODO Vision MISC
  // TODO Limb / add extra/convert existing to prehensile
  // TODO Skill  with SkillType and Aptitude Multiplier and Points
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

export type MeleeEffect = {
  type: EffectType.Melee;
  dvModifier: string;
};

export type RangedEffect = {
  type: EffectType.Ranged;
  negativeRangeModifiersMultiplier: number;
};

export type HealthRecoveryEffect = {
  interval: number;
  amount: string;
  stat: DotOrHotTarget;
  technologicallyAided: boolean;
  type: EffectType.HealthRecovery;
};

export type ArmorEffect = Record<ArmorType, number> & {
  type: EffectType.Armor;
  layerable: boolean;
};

export type DurationEffect = {
  type: EffectType.Duration;
  subtype: DurationEffectTarget;
  modifier: number;
  taskType: ActionSubtype | '';
  halve: boolean;
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

export enum DurationEffectTarget {
  EffectDuration = 'effectDuration',
  TaskActionTimeframe = 'taskActionTimeframe',
  Drugs = 'drugOrToxin',
  HealingTimeframes = 'healingTimeframes',
}

export type SkillEffect = {
  skillType: SkillType | FieldSkillType;
  field: string;
  specialization: string;
  type: EffectType.Skill;
  total: number;
  aptitudeMultiplier: number;
  linkedAptitude: AptitudeType;
};

export enum MovementEffectMode {
  Grant = 'grant',
  Modify = 'modify',
}

export type MovementEffect = Omit<MovementRate, 'type'> & {
  type: EffectType.Movement;
  movementType: Movement;
  mode: MovementEffectMode;
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

export const Source = Symbol();

export type SourcedEffect<T extends {}> = T & { [Source]: string };

export const isFieldSkillEffect = (
  skillType: SkillEffect['skillType'],
): skillType is FieldSkillType =>
  enumValues(FieldSkillType).some((type) => type === skillType);

const skill = createFeature<SkillEffect>(() => ({
  type: EffectType.Skill,
  field: '',
  specialization: '',
  skillType: SkillType.Psi,
  aptitudeMultiplier: 1,
  total: 0,
  linkedAptitude: AptitudeType.Willpower,
}));

const duration = createFeature<DurationEffect>(() => ({
  type: EffectType.Duration,
  subtype: DurationEffectTarget.EffectDuration,
  modifier: 0,
  taskType: '',
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
}));

const healthRecovery = createFeature<HealthRecoveryEffect>(() => ({
  type: EffectType.HealthRecovery,
  amount: '1d10',
  interval: CommonInterval.Hour,
  stat: DotOrHotTarget.Damage,
  technologicallyAided: true,
}));

const movement = createFeature<MovementEffect>(
  () => ({
    type: EffectType.Movement,
    base: 0,
    full: 0,
    movementType: Movement.Walker,
    mode: MovementEffectMode.Modify,
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
      return [effect.unique ? `[${effect.unique}]` : '', effect.description];

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
    case EffectType.HealthRecovery:
      return [
        localize('heal'),
        `${localize(effect.stat)}:`,
        formatAutoHealing(effect),
        effect.technologicallyAided ? `[${localize('tech')}]` : '',
      ];
    case EffectType.Armor:
      return [
        effect.layerable ? `[${localize('armorLayer')}]` : '',
        enumValues(ArmorType)
          .flatMap((armor) => {
            const value = effect[armor];
            return value ? `${withSign(value)} ${localize(armor)}` : [];
          })
          .join(', '),
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
        localize(effect.subtype).toLowerCase(),
        [
          DurationEffectTarget.Drugs,
          DurationEffectTarget.HealingTimeframes,
        ].includes(effect.subtype) && effect.halve
          ? `${localize('duration')} ${localize('halved')} (${localize(
              'cumulative',
            )})`.toLocaleLowerCase()
          : formatDurationPercentage(effect.modifier),
      ];

    case EffectType.Melee:
      return [
        effect.dvModifier,
        localize('SHORT', 'damageValue'),
        localize('to'),
        localize('meleeDamageRolls'),
      ];

    case EffectType.Ranged:
      return [
        ...map(['negative', 'range', 'modifiers'], localize),
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
      return [
        baseName + effect.specialization ? ` (${effect.specialization})` : '',
        effect.total
          ? effect.total
          : `@ ${localize(effect.linkedAptitude)} x${
              effect.aptitudeMultiplier
            }`,
      ];
    }

    case EffectType.Movement: {
      return [
        localize(effect.mode),
        localize(effect.movementType),
        effect.mode === MovementEffectMode.Grant
          ? `${localize('by')}  (${withSign(effect.base)} / ${withSign(
              effect.full,
            )})`
          : `(${effect.base} / ${effect.full})`,
      ];
    }
  }
};

export const formatDurationPercentage = (modifier: number) => {
  return `${localize(modifier < 0 ? 'reduced' : 'increased')} ${localize(
    'by',
  )} ${modifier}%`.toLocaleLowerCase();
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

export const matchesAptitude = (
  aptitude: AptitudeType,
  getSpecial: () => SpecialTest | '' | undefined,
) => (action: Action) => {
  const special = getSpecial();
  return anyEffectTagPasses(
    matchesAction(action),
    (tag) => tag.type === TagType.AptitudeChecks && tag.aptitude === aptitude,
    (tag) =>
      !!(special && tag.type === TagType.Special) && tag.test === special,
  );
};

export const matchesRep = (rep: RepBase) => (action: Action) => {
  return anyEffectTagPasses(
    matchesAction(action),
    (tag) => tag.type === TagType.Rep && rep.acronym === tag.network,
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

// const doubledEffects = new WeakMap<Effect, Effect | null>();
export const multiplyEffectModifier = (effect: Effect, multiplier = 2) => {
  // let doubled = doubledEffects.get(effect) || null;
  // if (doubled === undefined) {
  if (effect.type === EffectType.Armor) {
    const copy = { ...effect };
    enumValues(ArmorType).forEach((armor) => (copy[armor] *= multiplier));
    return copy;
  } else if ('modifier' in effect && effect.modifier) {
    const { modifier } = effect;
    if (typeof modifier === 'number') {
      return { ...effect, modifier: effect.modifier * multiplier };
    }
  }
  // }
  // doubledEffects.set(effect, doubled || null);
  // return doubled || effect;
  return effect;
};

export const totalModifiers = <T extends { modifier: number }>(
  effects: readonly T[],
) => effects.reduce((accum, { modifier }) => accum + modifier, 0);
