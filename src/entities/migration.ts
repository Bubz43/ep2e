import { updateManyActors } from '@src/foundry/misc-helpers';
import { EP } from '@src/foundry/system';
import { pipe, concat } from 'remeda';
import type { ActorEP } from './actor/actor';
import { ActorType, sleeveTypes } from './entity-types';
import { createActorEntity, createItemEntity } from './models';

// ! Make sure not to access proxies in migrations, instead use main entity

export const migrateWorld = async () => {
  await pipe(
    [...game.actors.values()].map(migrateActor),
    concat(
      [...game.scenes.values()].flatMap((scene) => {
        const { tokens } = scene.data;
        return tokens.flatMap((tokenData) => {
          const token = new Token(tokenData);
          return token.actor?.isToken ? migrateActor(token.actor) : [];
        });
      }),
    ),
    updateManyActors,
  );
};

const migrateActor = (actor: ActorEP) => {
  if (actor.type === ActorType.Character) {
    const epFlags = actor.data.flags[EP.Name] || {};
    for (const sleeveType of sleeveTypes) {
      const sleeveData = epFlags[sleeveType];
      if (sleeveData) {
        const updatedData = createActorEntity({
          name: sleeveData.name,
          type: sleeveData.type,
        });
        actor.updater
          .path('flags', EP.Name, sleeveData.type)
          .store(mergeObject(updatedData, sleeveData, { inplace: false }));
      }
    }
    if (epFlags.psi) {
      const psi = createItemEntity({
        name: epFlags.psi.name,
        type: epFlags.psi.type,
      });
      actor.updater
        .path('flags', EP.Name, epFlags.psi.type)
        .store(mergeObject(psi, epFlags.psi, { inplace: false }));
    }
  }
  return actor;
};
