import { localize } from '@src/foundry/localization';
import { packEntityIs, packIsVisible } from '@src/foundry/misc-helpers';
import { notEmpty } from '@src/utility/helpers';
import { compact, filter, flatMap, pipe } from 'remeda';
import { ItemType, sleeveTypes } from '../entity-types';
import type { ItemProxy } from '../item/item';
import { ActorEP } from './actor';
import type { Biological } from './proxies/biological';
import type { Character } from './proxies/character';
import type { Infomorph } from './proxies/infomorph';
import type { Synthetic } from './proxies/synthetic';

export type Sleeve = Biological | Synthetic | Infomorph;

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

export const ownedSleeves = () => {
  return pipe(
    [...game.actors.values()],
    filter((a) => a.owner),
    getSleeves,
  );
};

export const formattedSleeveInfo = (sleeve: Sleeve) => {
  return compact([
    'size' in sleeve && localize(sleeve.size),
    sleeve.subtype ? localize(sleeve.subtype as any) : localize(sleeve.type),
    'isSwarm' in sleeve && sleeve.isSwarm && localize('swarm'),
    'sex' in sleeve && sleeve.sex,
  ]);
};
