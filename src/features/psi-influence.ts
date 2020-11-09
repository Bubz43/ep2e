import { ItemType } from '@src/entities/entity-types';
import { Trait } from '@src/entities/item/proxies/trait';
import { ItemEntity, createItemEntity } from '@src/entities/models';
import { localize } from '@src/foundry/localization';
import { rollFormula } from '@src/foundry/rolls';
import { html } from 'lit-html';
import { range } from 'remeda';
import type { Effect } from './effects';
import { StringID, createFeature, addFeature } from './feature-helpers';
import { Motivation, createMotivation } from './motivations';
import { EPTimeInterval, CommonInterval } from './time';
import { toMilliseconds } from './modify-milliseconds';

export enum PsiInfluenceType {
  Damage = 'physicalDamage',
  Trait = 'trait',
  Motivation = 'motivation',
  Unique = 'unique',
}

export type InfluenceRoll = 1 | 2 | 3 | 4 | 5 | 6;

type Influence<T extends { type: PsiInfluenceType }> = T & {
  description: string;
  roll: InfluenceRoll;
};

export type MotivationInfluence = Influence<{
  type: PsiInfluenceType.Motivation;
  motivation: Motivation;
}>;

export type DamageInfluence = Influence<{
  type: PsiInfluenceType.Damage;
  formula: string;
}>;

export type UniqueInfluence = Influence<{
  type: PsiInfluenceType.Unique;
  name: string;
  description: string;
  duration: number;
  effects: {
    durationFormula: string;
    interval: EPTimeInterval;
    items: StringID<Effect>[];
  };
}>;

export type TraitInfluence = Influence<{
  type: PsiInfluenceType.Trait;
  trait: ItemEntity<ItemType.Trait>;
}>;

export type PsiInfluence =
  | MotivationInfluence
  | DamageInfluence
  | UniqueInfluence
  | TraitInfluence;

export type TemporaryInfluence = Exclude<PsiInfluence, DamageInfluence>;

const influenceBase = <T extends PsiInfluenceType>(type: T) => ({
  type,
  description: '',
});

const motivation = createFeature<MotivationInfluence, 'roll' | 'motivation'>(
  () => influenceBase(PsiInfluenceType.Motivation),
);

const damage = createFeature<DamageInfluence, 'roll' | 'formula'>(() =>
  influenceBase(PsiInfluenceType.Damage),
);

const unique = createFeature<
  UniqueInfluence,
  'roll' | 'name' | 'effects' | 'duration'
>(() => influenceBase(PsiInfluenceType.Unique));

const trait = createFeature<TraitInfluence, 'roll' | 'trait'>(() =>
  influenceBase(PsiInfluenceType.Trait),
);

export const createPsiInfluence = { motivation, damage, unique, trait };

export const createDefaultInfluence = (
  roll: InfluenceRoll,
  type: PsiInfluenceType,
) => {
  switch (type) {
    case PsiInfluenceType.Damage:
      return damage({ roll, formula: '1d6' });

    case PsiInfluenceType.Motivation:
      return motivation({
        roll,
        motivation: createMotivation({}),
      });

    case PsiInfluenceType.Trait:
      return trait({
        roll,
        trait: createItemEntity({
          name: 'Modify Behavior',
          type: ItemType.Trait,
        }),
      });

    case PsiInfluenceType.Unique:
      return unique({
        description: '',
        name: 'Custom Influence',
        roll,
        duration: CommonInterval.Day,
        effects: {
          items: [],
          interval: EPTimeInterval.Minutes,
          durationFormula: '1d6',
        },
      });
  }
};

export const createDefaultPsiInfluences = () => {
  return range(1, 7).reduce((influences, num) => {
    const roll = num as InfluenceRoll;
    return addFeature(
      influences,
      roll === 1
        ? createDefaultInfluence(roll, PsiInfluenceType.Damage)
        : [2, 3].includes(roll)
        ? createDefaultInfluence(roll, PsiInfluenceType.Trait)
        : [4, 5].includes(roll)
        ? createDefaultInfluence(roll, PsiInfluenceType.Motivation)
        : createDefaultInfluence(roll, PsiInfluenceType.Unique),
    );
  }, [] as StringID<PsiInfluence>[]);
};

export const influenceSort = (influence: PsiInfluence) => influence.roll;

export const influenceInfo = (influence: PsiInfluence) => {
  switch (influence.type) {
    case PsiInfluenceType.Damage:
      return {
        name: `${localize('takeDV')} ${influence.formula}`,
      };

    case PsiInfluenceType.Motivation: {
      const { motivation, description } = influence;
      return {
        name: html`
          <motivation-item .motivation=${motivation}></motivation-item>
        `,
        description,
      };
    }

    case PsiInfluenceType.Trait: {
      const trait = new Trait({
        data: influence.trait,
        embedded: localize('psi'),
        lockSource: true,
      });
      return {
        name: trait.fullName,
        description: trait.description,
      };
    }

    case PsiInfluenceType.Unique:
      return {
        name: `${influence.name}`,
        description: influence.description,
      };
  }
};

export const influenceTimeframe = (influence: TemporaryInfluence) => {
  switch (influence.type) {
    case PsiInfluenceType.Motivation:
      return toMilliseconds({ hours: rollFormula('1d6').total || 0 });

    case PsiInfluenceType.Trait:
      return toMilliseconds({ minutes: rollFormula('1d6').total || 0 });

    case PsiInfluenceType.Unique: {
      return influence.duration;
    }
  }
};
