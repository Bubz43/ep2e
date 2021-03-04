import type { Character } from '@src/entities/actor/proxies/character';
import { ItemType } from '@src/entities/entity-types';
import type { MeleeWeapon } from '@src/entities/item/proxies/melee-weapon';
import { localize } from '@src/foundry/localization';
import { MWCMenuOption, openMenu } from '@src/open-menu';
import produce from 'immer';
import { noop } from 'remeda';

export const openMeleeCoatingMenu = (
  ev: MouseEvent,
  character: Character,
  weapon: MeleeWeapon,
) => {
  const { coating } = weapon;
  const coatings =
    character?.consumables.flatMap((c) =>
      c.type === ItemType.Substance && !(c.isBlueprint || c.isElectronic)
        ? c
        : [],
    ) ?? [];
  const content: MWCMenuOption[] = [];
  if (coating) {
    content.push(
      {
        label: `${localize('remove')} ${coating.name}  (${localize(
          'discard',
        )})`,
        callback: () => weapon.removeCoating(),
      },
      {
        label: `${localize('remove')} ${coating.name} (${localize('keep')})`,
        callback: async () => {
          const same = coatings.find((c) => c.isSameAs(coating));
          if (same) await same.setQuantity((current) => current + 1);
          else
            await character?.itemOperations.add(
              produce(
                coating.getDataCopy(),
                ({ data }) => void (data.quantity = 1),
              ),
            );
          await weapon.removeCoating();
        },
      },
    );
  } else {
    content.push(
      ...coatings.map((c) => ({
        label: c.fullName,
        callback: async () => {
          await weapon.setCoating(c);
          c.setQuantity((current) => current - 1);
        },
        activated: weapon.coating?.isSameAs(c),
        disabled: !c.quantity,
      })),
    );
    if (content.length === 0) {
      content.push({
        label: `${localize('no')} ${localize('available')} ${localize(
          'coating',
        )}`,
        callback: noop,
        disabled: true,
      });
    }
  }

  openMenu({
    position: ev,
    header: { heading: `${weapon.name} ${localize('coating')}` },
    content,
  });
};
