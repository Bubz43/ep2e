import { MorphCost, Complexity } from '@src/data-enums';
import { uniqueStringID } from '@src/features/feature-helpers';
import { localize } from '@src/foundry/localization';
import { range, set } from 'remeda';
import { ActorType } from '../entity-types';
import { createDefaultItem } from '../item/default-items';
import { createActorEntity } from '../models';

const defaultReference = (pageNumber: number) =>
  `Eclipse Phase Second Editon p. ${pageNumber}`;

export const createDigimorph = () => {
  const uniqueIds: string[] = [];
  const newUniqueId = () => {
    const id = uniqueStringID(uniqueIds);
    uniqueIds.push(id);
    return id;
  };
  const sleeve = createActorEntity({
    type: ActorType.Infomorph,
    name: localize('digimorph'),
    data: {
      description: `<p>Digimorphs are bare-bones mind emulations, though customizable and widely
        used. By default, an ego that evacuates (or is forked from) a cyberbrain is run
        on a digimorph, unless another infomorph option is available.</p>`,
      reference: defaultReference(67),
      acquisition: {
        resource: MorphCost.MorphPoints,
        availability: 100,
        cost: 0,
        complexity: Complexity.Minor,
        restricted: false,
      },
      meshHealth: {
        ...game.system.model.Actor.infomorph.meshHealth,
        baseDurability: 25,
      },
    },
    items: [
      createDefaultItem.exoticMorphology(3),
      createDefaultItem.digitalSpeed(),
      createDefaultItem.mnemonicsWare(),
    ].map(set('_id', newUniqueId())),
  });
  return sleeve;
};
