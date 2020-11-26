import type { RechargeType } from '@src/data-enums';
import { localize } from '@src/foundry/localization';
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

export type TemporaryFeature = ActiveRecharge | TemporaryEffects;

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

export const createTemporaryFeature = {
  activeRecharge,
  effects,
} as const;
