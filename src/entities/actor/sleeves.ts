import {
  userCan,
  packEntityIs,
  packIsVisible,
} from '@src/foundry/misc-helpers';
import { EP } from '@src/foundry/system';
import { notEmpty } from '@src/utility/helpers';
import { pipe, filter, createPipe, flatMap } from 'remeda';
import { ItemType, sleeveTypes } from '../entity-types';
import type { ItemEP, ItemProxy } from '../item/item';
import type { ActorEntity, SleeveType } from '../models';
import { ActorEP } from './actor';
import type { Biological } from './proxies/biological';
import type { Character } from './proxies/character';
import type { Infomorph } from './proxies/infomorph';
import type { SyntheticShell } from './proxies/synthetic-shell';

export type Sleeve = Biological | SyntheticShell | Infomorph;

export type ResleevingSettings = {
  character: Character;
  into: Sleeve;
  keepCurrent: boolean;
  keepInto: boolean;
};

export type ResleeveOptions = Pick<
  ResleevingSettings,
  'keepCurrent' | 'keepInto'
>;

// export const resleeve = async ({
//   character,
//   into,
//   keepCurrent,
//   keepInto,
// }: ResleevingSettings) => {
//   const { sleeve: currentSleeve, actor: currentActor } = character;
//   const [newSleeve, sleeveActor] = into;
//   const sleeveItems = currentSleeve?.items;

//   if (currentSleeve) {
//     character.actor.subscriptions.unsubscribe(currentSleeve.updater);
//     if (keepCurrent) {
//       if (!userCan("ACTOR_CREATE"))
//         throw new Error("User cannot create actors.");
//       await currentSleeve.createActor();
//     }

//     if (newSleeve.type !== currentSleeve.type) {
//       character.updater.prop("flags", EP.Name, currentSleeve.type).store(null);
//     }
//   }

//   await currentActor.deleteOwnedItem(
//     [...(sleeveItems || [])].map((item) => item.id)
//   );

//   const { items } = newSleeve;
//   await character.updater
//     .prop("flags", EP.Name, newSleeve.type)
//     .commit(
//       (sleeve) =>
//         mergeObject(
//           newSleeve,
//           { items: [] },
//           { inplace: false }
//         ) as typeof sleeve
//     );

//   if (notEmpty(items)) {
//     await currentActor.createOwnedItem(duplicate(items));
//   }

//   if (!keepInto && sleeveActor && game.actors.has(sleeveActor.id)) {
//     await sleeveActor.delete({});
//   }
//   return currentActor;
// };

export const isSleeveItem = (proxy: ItemProxy) => {
  switch (proxy.type) {
    case ItemType.Trait:
      return proxy.isMorphTrait;

    case ItemType.Psi:
    case ItemType.Sleight:
    case ItemType.Explosive:
    case ItemType.Substance:
    case ItemType.PhysicalService:
    case ItemType.FirearmAmmo:
    case ItemType.ThrownWeapon:
      return false;

    case ItemType.Software:
      return proxy.equipped;

    default:
      return !!proxy.wareType && proxy.equipped;
  }
};

export const isSleeve = (proxy: ActorEP['proxy']): proxy is Sleeve => {
  return sleeveTypes.some((type) => proxy.type === type);
};

export const getSleeves = flatMap<ActorEP, Sleeve>(({ proxy }) =>
  isSleeve(proxy) ? proxy : [],
);

export const sleevePacks = async () => {
  const packs: { name: string; sleeves: Sleeve[] }[] = [];
  for (const pack of game.packs) {
    if (packEntityIs(pack, ActorEP) && packIsVisible(pack)) {
      const actors = await pack.getContent();
      const sleeves = getSleeves(actors);
      if (notEmpty(sleeves)) packs.push({ name: pack.metadata.label, sleeves });
    }
  }
  return packs;
};

export const gameSleeves = () => {
  return pipe(
    game.actors.entries,
    filter((a) => a.owner),
    getSleeves,
  );
};
