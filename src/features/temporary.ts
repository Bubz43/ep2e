import type { RechargeType } from '@src/data-enums';
import { localize } from '@src/foundry/localization';
import type { ConditionType } from './conditions';
import type { Effect } from './effects';
import { createFeature, StringID } from './feature-helpers';
import { CommonInterval, currentWorldTimeMS } from './time';

export enum TemporaryFeatureEnd {
  Recharge = 'recharge',
  NextAction = 'nextAction',
  Resleeve = 'resleeve',
}

export enum TemporaryFeatureType {
  ActiveRecharge = 'activeRecharge',
  Effects = 'effects',
  Condition = 'condition',
}

type Base<T extends { type: TemporaryFeatureType }> = T & {
  startTime: number;
  duration: number;
  endOn: '' | TemporaryFeatureEnd;
  name: string;
};

export type ActiveRecharge = Base<{
  type: TemporaryFeatureType.ActiveRecharge;
  rechargeType: RechargeType;
  regainedPoints: number;
  endOn: TemporaryFeatureEnd.Recharge;
}>;

export type TemporaryEffects = Base<{
  type: TemporaryFeatureType.Effects;
  effects: StringID<Effect>[];
}>;

export type TemporaryCondition = Base<{
  type: TemporaryFeatureType.Condition;
  condition: ConditionType;
}>;

export type TemporaryFeature =
  | ActiveRecharge
  | TemporaryEffects
  | TemporaryCondition;

const activeRecharge = createFeature<
  ActiveRecharge,
  'rechargeType' | 'duration' | 'regainedPoints'
>(({ rechargeType }) => ({
  startTime: currentWorldTimeMS(),
  endOn: TemporaryFeatureEnd.Recharge,
  type: TemporaryFeatureType.ActiveRecharge,
  name: localize(rechargeType),
}));

const effects = createFeature<TemporaryEffects, 'name'>(() => ({
  effects: [],
  startTime: currentWorldTimeMS(),
  type: TemporaryFeatureType.Effects,
  duration: CommonInterval.Turn,
  endOn: '',
}));

const condition = createFeature<TemporaryCondition, 'name' | 'condition'>(
  () => ({
    type: TemporaryFeatureType.Condition,
    duration: CommonInterval.Turn,
    endOn: '',
    startTime: currentWorldTimeMS(),
  }),
);

export const createTemporaryFeature = {
  activeRecharge,
  effects,
  condition
} as const;
