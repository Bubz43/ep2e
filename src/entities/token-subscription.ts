import { readyCanvas } from '@src/foundry/canvas';
import type { TokenData } from '@src/foundry/foundry-cont';
import {
  mutateEntityHook,
  MutateEvent,
  mutatePlaceableHook,
} from '@src/foundry/hook-setups';
import { BehaviorSubject, PartialObserver } from 'rxjs';
import type { Split } from 'type-fest/camel-case';
import { createTempToken, findToken } from './find-entities';
import { SceneEP } from './scene';

const tokenSubjects = new Map<`${string}-${string}`, BehaviorSubject<Token>>();

const toKey = (ids: { tokenId: string; sceneId: string }) => {
  return `${ids.tokenId}-${ids.sceneId}` as const;
};

const fromKey = <T extends string>(str: T) => {
  return str.split('-') as Split<T, '-'>;
};

Hooks.on('canvasReady', () => {
  const scene = readyCanvas()?.scene;
  scene?.data.tokens.forEach((tokenData) => sceneUpdate(scene, tokenData));
});

const sceneUpdate = (scene: SceneEP, tokenData: Readonly<TokenData>) => {
  const subject = tokenSubjects.get(
    toKey({ tokenId: tokenData._id, sceneId: scene.id }),
  );
  if (subject) {
    const canvas = readyCanvas();
    const existing =
      canvas?.scene === scene ? canvas?.tokens.get(tokenData._id) : null;
    subject.next(existing ?? createTempToken(tokenData, scene));
  }
};
mutatePlaceableHook({
  entity: Token,
  hook: 'on',
  event: MutateEvent.Update,
  callback: sceneUpdate,
});

mutatePlaceableHook({
  entity: Token,
  hook: 'on',
  event: MutateEvent.Delete,
  callback: (scene, tokenData) => {
    const key = toKey({ tokenId: tokenData._id, sceneId: scene.id });
    const subject = tokenSubjects.get(key);
    if (subject) {
      subject.complete();
      tokenSubjects.delete(key);
    }
  },
});

mutateEntityHook({
  entity: SceneEP,
  hook: 'on',
  event: MutateEvent.Delete,
  callback: (scene) => {
    for (const [key, subject] of tokenSubjects) {
      const [_, sceneId] = fromKey(key);
      if (sceneId === scene.id) {
        subject.complete();
        tokenSubjects.delete(key);
      }
    }
  },
});

export const subscribeToToken = (
  ids: { tokenId: string; sceneId: string },
  observer: PartialObserver<Token>,
) => {
  const key = toKey(ids);
  let subject = tokenSubjects.get(key);
  if (!subject) {
    const token = findToken(ids);
    if (token) {
      subject = new BehaviorSubject(token);
      tokenSubjects.set(key, subject);
    } else observer.complete?.();
  }
  return subject?.subscribe(observer) ?? null;
};
