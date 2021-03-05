import type { Character } from '@src/entities/actor/proxies/character';
import { ItemType } from '@src/entities/entity-types';
import type { MeleeWeapon } from '@src/entities/item/proxies/melee-weapon';
import { localize } from '@src/foundry/localization';
import { MWCMenuOption, openMenu } from '@src/open-menu';
import produce from 'immer';
import { noop } from 'remeda';

export const openMeleePayloadMenu = (
  ev: MouseEvent,
  character: Character,
  weapon: MeleeWeapon,
) => {
  const { payload } = weapon;
  const { explosives } = character.weapons;

  const content: MWCMenuOption[] = [];
  if (payload) {
    content.push(
      {
        label: `${localize('remove')} ${payload.name}  (${localize(
          'discard',
        )})`,
        callback: () => weapon.removePayload(),
      },
      {
        label: `${localize('remove')} ${payload.name} (${localize('keep')})`,
        callback: async () => {
          const same = explosives.find((p) => p.isSameAs(payload));
          if (same) await same.setQuantity((current) => current + 1);
          else
            await character?.itemOperations.add(
              produce(
                payload.getDataCopy(),
                ({ data }) => void (data.quantity = 1),
              ),
            );
          await weapon.removePayload();
        },
      },
    );
  } else {
    content.push(
      ...explosives.map((p) => ({
        label: p.fullName,
        sublabel: p.fullType,
        callback: async () => {
          await weapon.setPayload(p);
          p.setQuantity((current) => current - 1);
        },
        disabled: !p.quantity,
      })),
    );
    if (content.length === 0) {
      content.push({
        label: `${localize('no')} ${localize('available')} ${localize(
          'payloads',
        )}`,
        callback: noop,
        disabled: true,
      });
    }
  }

  openMenu({
    position: ev,
    header: { heading: `${weapon.name} ${localize('payload')}` },
    content,
  });
};

export const openMeleeCoatingMenu = (
  ev: MouseEvent,
  character: Character,
  weapon: MeleeWeapon,
) => {
  const { coating } = weapon;
  const coatings =
    character.consumables.flatMap((c) =>
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
        sublabel: c.fullType,
        callback: async () => {
          await weapon.setCoating(c);
          c.setQuantity((current) => current - 1);
        },
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
