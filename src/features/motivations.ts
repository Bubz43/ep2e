import { createFeature } from './feature-helpers';

export enum MotivationStance {
  Oppose = 'oppose',
  Support = 'support',
}

export type Motivation = {
  objective: string;
  stance: MotivationStance;
  goal: string;
};

export const createMotivation = createFeature<Motivation>(() => ({
  objective: '',
  stance: MotivationStance.Support,
  goal: '',
}));

export const motivationSort = (a: Motivation, b: Motivation) =>
  a.stance.length - b.stance.length || a.objective.length - b.objective.length;

// TODO: Apply stress relief
// ? Goals array, or maybe say common seperated
