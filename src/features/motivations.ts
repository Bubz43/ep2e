import { createFeature, StringID } from './feature-helpers';

export enum MotivationStance {
  Oppose = 'oppose',
  Support = 'support',
}

export type MotivationalGoal = {
  goal: string;
  completed: boolean;
};

export type Motivation = {
  cause: string;
  stance: MotivationStance;
  goals: StringID<MotivationalGoal>[];
};

export const createMotivation = createFeature<Motivation>(() => ({
  cause: '',
  stance: MotivationStance.Support,
  goals: [],
}));

export const createMotivationalGoal = createFeature<MotivationalGoal>(() => ({
  completed: false,
  goal: '',
}));

export const motivationSort = (a: Motivation, b: Motivation) =>
  a.stance.length - b.stance.length || a.cause.length - b.cause.length;

// })
// TODO: Apply stress relief
// ? Goals array, or maybe say common seperated
