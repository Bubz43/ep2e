import { AptitudeType } from '@src/data-enums';
import type { AddEffects } from '@src/entities/applied-effects';
import { localize } from '@src/foundry/localization';
import { compact } from 'remeda';
import { SuccessTestEffect, createEffect } from './effects';
import { createTag } from './tags';

export enum Size {
  VerySmall = 'verySmall',
  Small = 'small',
  Medium = 'medium',
  Large = 'large',
  VeryLarge = 'veryLarge',
}

export const sizeModifiers: Record<Exclude<Size, Size.Medium>, number> = {
  [Size.VerySmall]: -30,
  [Size.Small]: -10,
  [Size.Large]: 10,
  [Size.VeryLarge]: 30,
};

const sizeDVBonus = {
  [Size.Large]: '+1d10',
  [Size.VeryLarge]: '+2d10',
} as const;

const sizeTargettedEffect = (size: Size) => {
  if (size === Size.Medium) return null;
  return createEffect.successTest({
    modifier: sizeModifiers[size],
    requirement: localize('attackingOrSpotting'),
    toOpponent: true,
    tags: [createTag.action({})],
  });
};

const strengthSizeEffect = (size: Size) => {
  if (size === Size.Medium) return null;
  return createEffect.successTest({
    modifier: sizeModifiers[size],
    requirement: localize('strengthBased'),
    tags: [createTag.aptitudeCheck({ aptitude: AptitudeType.Somatics })],
  });
};

const meleeDamageEffect = (size: Size) => {
  if (size !== Size.Large && size !== Size.VeryLarge) return null;
  return createEffect.melee({ dvModifier: sizeDVBonus[size] });
};

const sizeEffects = new Map<Size, AddEffects | null>();

export const getEffectsFromSize = (size: Size) => {
  let group = sizeEffects.get(size);
  if (!group) {
    if (size === Size.Medium) group = null;
    else {
      group = {
        source: `${localize(size)} ${localize('size')}`,
        effects: compact([
          sizeTargettedEffect(size),
          strengthSizeEffect(size),
          meleeDamageEffect(size),
        ]),
      };
    }
    sizeEffects.set(size, group);
  }
  return group;
};
