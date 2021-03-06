import { AptitudeType } from '@src/data-enums';
import type { AppliedEffects } from '@src/entities/applied-effects';
import { localize } from '@src/foundry/localization';
import { clamp, compact, flatten, pipe, reduce } from 'remeda';
import { notEmpty, safeMerge } from '../utility/helpers';
import { DurationEffect, extractDurationEffectMultipliers } from './effects';
import { createFeature } from './feature-helpers';
import { toMilliseconds } from './modify-milliseconds';
import { currentWorldTimeMS } from './time';

export enum ActionType {
  Automatic = 'automatic',
  Quick = 'quick',
  Complex = 'complex',
  Task = 'task',
}

export enum ActionSubtype {
  Physical = 'physical',
  Mesh = 'mesh',
  Mental = 'mental',
}

export type Action = {
  type: ActionType;
  subtype: ActionSubtype;
  timeframe: number;
  timeMod: number;
  notes: string;
};

export type ActiveTaskAction = {
  name: string;
  timeframe: number;
  timeTaken: number;
  paused: boolean;
  actionSubtype: ActionSubtype;
  failed: boolean;
  startTime: number;
  modifiers?: { source: string; modifier: number }[];
};

export const createActiveTask = createFeature<
  ActiveTaskAction,
  'name' | 'timeframe' | 'actionSubtype'
>(() => ({
  startTime: currentWorldTimeMS(),
  paused: false,
  failed: false,
  timeTaken: 0,
  modifiers: [],
}));

export const taskState = (
  { timeTaken, timeframe, actionSubtype, modifiers = [] }: ActiveTaskAction,
  effects: AppliedEffects['taskTimeframeEffects'],
) => {
  const finalTimeframe = pipe(
    [effects.get(''), effects.get(actionSubtype)],
    compact,
    flatten(),
    (effects) =>
      extractDurationEffectMultipliers(
        effects,
        ...modifiers.map((m) => m.modifier),
      ),
    reduce((accum, multiplier) => accum * multiplier || 1, timeframe),
  );
  return {
    completed: timeTaken >= finalTimeframe,
    progress: timeTaken / finalTimeframe,
    indefinite: finalTimeframe < 0,
    remaining: finalTimeframe - timeTaken,
    finalTimeframe,
  };
};

export type TaskState = ReturnType<typeof taskState>;

export const createAction = createFeature<Action>(() => ({
  type: ActionType.Automatic,
  subtype: ActionSubtype.Mental,
  timeframe: 0,
  timeMod: 0,
  notes: '',
}));

export const updateAction = (action: Action, update: Partial<Action>) => {
  const updated = safeMerge(action, update);
  if (updated.type === ActionType.Automatic) {
    updated.timeMod = 0;
    updated.timeframe = 0;
  } else if (updated.type !== ActionType.Task) {
    updated.timeMod = clamp(updated.timeMod, { min: 0, max: 6 });
    updated.timeframe = toMilliseconds({ minutes: updated.timeMod });
  } else {
    if (update.type && !update.timeframe) updated.timeframe = 0;
    if (!updated.timeframe) updated.timeMod = 0;
  }
  return updated;
};

// TODO: Find aptitude check examples to see if this can be better narrowed
export const defaultCheckActionSubtype = (aptitude: AptitudeType) => {
  switch (aptitude) {
    case AptitudeType.Reflexes:
    case AptitudeType.Somatics:
      return ActionSubtype.Physical;

    case AptitudeType.Savvy:
    case AptitudeType.Willpower:
    case AptitudeType.Intuition:
    case AptitudeType.Cognition:
      return ActionSubtype.Mental;
  }
};

export const applyTaskActionMultiplier = (
  timeframe: number,
  multiplier: number,
) => {
  return timeframe * clamp(multiplier, { min: 0.25 });
};

// export const totalDurationEffectModifiers = (effects: DurationEffect[]) =>
//   effects.reduce((accum, { modifier }) => accum + modifier, 0);

// export const filterDurationEffects = <T extends DurationEffect[]>(
//   { subtype }: Action,
//   effects: T
// ) => {
//   return effects.filter(
//     (effect) => !effect.taskType || effect.taskType === subtype
//   ) as T;
// };

export const actionTimeframeModifier = ({ type, timeMod }: Action) => {
  const modifier = type === ActionType.Task ? timeMod * 0.25 : 0;
  const source = localize(modifier < 0 ? 'rushing' : 'takingTime');
  return { source, modifier };
};

export const applyFailureToTaskTimeframe = (timeframe: number) =>
  timeframe * 0.25;

// export const successTestResultTimeframeModifier = (
//   result: SuccessResult | FailureResult
// ): TaskActionTimeframeModifier | null => {
//   const source = localize(result);
//   switch (result) {
//     case SuccessResult.Superior:
//       return { source, modifier: -0.25 };
//     case SuccessResult.SuperiorX2:
//       return { source, modifier: -0.5 };

//     case FailureResult.Superior:
//       return { source, modifier: 0.25 };

//     case FailureResult.SuperiorX2:
//       return { source, modifier: 0.5 };

//     default:
//       return null;
//   }
// };

export type TaskActionTimeframeModifier = {
  source: string;
  modifier: number;
};

// export const convertEffectsToTimeframeModifier = (
//   effects: SourcedEffect<DurationEffect>[]
// ) =>
//   effects.map((effect) => ({
//     source: effect[Source],
//     modifier: effect.modifier / 100,
//   }));
