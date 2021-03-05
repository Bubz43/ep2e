import type { SceneEP } from '@src/entities/scene';
import { readyCanvas } from '@src/foundry/canvas';
import { mutateEntityHook, MutateEvent } from '@src/foundry/hook-setups';
import { gameSettings } from '@src/init';
import { createFeature } from './feature-helpers';

// export interface EnvironmentInfo {
//   name: string;
//   gravity: number; // g
//   img: string;
//   type: string;
//   primaryStary: string;
//   diameter: number; // km
//   atmosphericPressure: number; //atm
//   atmosphericComposition: { percent: number; label: string }[];
//   surfaceTemperature: { min: number; mean: number; max: number }; // C
//   dayLength: number;
//   orbitalPeriod: number;
//   orbitalDistance: {
//     perihelion: number;
//     aphelion: number;
//   }; // AU;
//   satellites: string[];
//   oceanCoverage: number;
//   gateAccess: string;
// }

export type Environment = {
  name: string;
  vacuum: boolean;
  gravity: number;
  img: string;
  notes: string;
};

export type EnvironmentOverrides = Record<keyof Environment, boolean>;

export const createEnvironment = createFeature<Environment>(() => ({
  name: '',
  vacuum: false,
  gravity: 1,
  img: '',
  notes: '',
}));

export const createEnvironmentOverrides = createFeature<EnvironmentOverrides>(
  () => ({
    name: false,
    vacuum: false,
    gravity: false,
    img: false,
    notes: false,
  }),
);

export const activeEnvironmentInfo = (
  sceneFlags: SceneEP['epFlags'] | undefined,
) => {
  const {
    name,
    img,
    gravity,
    vacuum,
    notes,
  } = gameSettings.environment.current;
  const { environment, environmentOverrides } = sceneFlags || {};
  const activeName = environmentOverrides?.name ? environment?.name : name;

  const activeGravity =
    environmentOverrides?.gravity && environment
      ? environment.gravity
      : gravity;

  const activeVacuum =
    environmentOverrides?.vacuum && environment ? environment.vacuum : vacuum;

  const activeImg = environmentOverrides?.img ? environment?.img : img;

  const activeNotes = environmentOverrides?.notes ? environment?.notes : notes;
  return {
    name: activeName,
    gravity: activeGravity,
    vacuum: activeVacuum,
    img: activeImg,
    notes: activeNotes,
  };
};

export const getCurrentEnvironment = () =>
  activeEnvironmentInfo(readyCanvas()?.scene.epFlags);

const environmentChangeSubscriptions = new Set<() => void>();

let callSubscriptions: (() => void) | null = null;

export const subscribeToEnvironmentChange = (callback: () => void) => {
  if (!callSubscriptions) {
    callSubscriptions = () => {
      for (const sub of environmentChangeSubscriptions) {
        sub();
      }
    };
    gameSettings.environment.subscribe(callSubscriptions);
    for (const event of [MutateEvent.Update, MutateEvent.Delete]) {
      mutateEntityHook({
        entity: Scene,
        hook: 'on',
        event,
        callback: callSubscriptions,
      });
    }
    Hooks.on('canvasReady', callSubscriptions);
  }
  environmentChangeSubscriptions.add(callback);
  return () => environmentChangeSubscriptions.delete(callback);
};
