import { AptitudeType } from "@src/data-enums";
import { localize } from "@src/foundry/localization";
import { SuccessTestEffect, createEffect } from "./effects";
import { createTag } from "./tags";

export enum Size {
  VerySmall = "verySmall",
  Small = "small",
  Medium = "medium",
  Large = "large",
  VeryLarge = "veryLarge",
}

const strengthEffects = new Map<Size, SuccessTestEffect>();

const targettedEffects = new Map<Size, SuccessTestEffect>();

export const sizeModifiers: Record<Exclude<Size, Size.Medium>, number> = {
  [Size.VerySmall]: -30,
  [Size.Small]: -10,
  [Size.Large]: 10,
  [Size.VeryLarge]: 30,
};

export const sizeTargettedEffect = (size: Size) => {
  if (size === Size.Medium) return null;
  let effect = targettedEffects.get(size);
  if (!effect) {
    effect = createEffect.successTest({
      modifier: sizeModifiers[size],
      requirement: localize("attackingOrSpotting"),
      toOpponent: true,
      tags: [createTag.action({})],
    });
    targettedEffects.set(size, effect);
  }
  return effect;
};

export const strengthSizeEffect = (size: Size) => {
  if (size === Size.Medium) return null;
  let effect = strengthEffects.get(size);
  if (!effect) {
    effect = createEffect.successTest({
      modifier: sizeModifiers[size],
      requirement: localize("strengthBased"),
      tags: [createTag.aptitudeCheck({ aptitude: AptitudeType.Somatics })],
    });
    strengthEffects.set(size, effect);
  }
  return effect;
};
