import {
  userCan,
  packEntityIs,
  packIsVisible,
} from '@src/foundry/misc-helpers';
import { EP } from '@src/foundry/system';
import { notEmpty } from '@src/utility/helpers';
import { pipe, filter } from 'remeda';
import { ItemType, sleeveTypes } from '../entity-types';
import type { ItemEP } from '../item/item';
import type { ActorEntity, SleeveType } from '../models';
import { ActorEP } from './actor';
import type { Biological } from './proxies/biological';
import type { Character } from './proxies/character';
import type { Infomorph } from './proxies/infomorph';
import type { SyntheticShell } from './proxies/synthetic-shell';

export type Sleeve = Biological | SyntheticShell | Infomorph;

export type SleeveGroup = [Sleeve, ActorEP];

export type ResleevingSettings = {
  character: Character;
  into: [ActorEntity<SleeveType>, ActorEP | undefined];
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

// export const isSleeveItem = ({ agent }: ItemEP) => {
//   switch (agent.type) {
//     case ItemType.Trait:
//       return agent.isMorphTrait;

//     case ItemType.Psi:
//     case ItemType.Sleight:
//     case ItemType.Explosive:
//     case ItemType.Substance:
//     case ItemType.PhysicalService:
//     case ItemType.FirearmAmmo:
//     case ItemType.ThrownWeapon:
//       return false;

//     case ItemType.Software:
//       return agent.requiresInstallation && agent.equipped;

//     default:
//       return !!agent.wareType && agent.equipped;
//   }
// };

const isSleeve = (agent: ActorEP['agent']): agent is Sleeve => {
  return sleeveTypes.some((type) => agent.type === type);
};

export const getSleeves = (actors: ActorEP[]) => {
  const sleeves: SleeveGroup[] = [];
  for (const actor of actors) {
    if (isSleeve(actor.agent)) {
      sleeves.push([actor.agent, actor]);
    }
    // switch (actor.agent.type) {
    //   case ActorType.Biological:
    //   case ActorType.SyntheticShell:
    //     sleeves.push([actor.agent, actor]);
    //     break;

    //   default:
    //     break;
    // }
  }
  return sleeves;
};

export const sleevePacks = async () => {
  const packs: { name: string; sleeves: SleeveGroup[] }[] = [];
  for (const pack of game.packs) {
    if (packEntityIs(pack, ActorEP) && packIsVisible(pack)) {
      const actors = await pack.getContent();
      const sleeves = getSleeves(actors);
      if (notEmpty(sleeves)) packs.push({ name: pack.metadata.label, sleeves });
    }
  }
  return packs;
};

export const sleeveActors = () => {
  return pipe(
    game.actors.entries,
    filter((a) => a.owner),
    getSleeves,
  );
};
