import type { DamageMessageData } from '@src/chat/message-data';
import { SuperiorResultEffect } from '@src/data-enums';
import {
  formulasFromMeleeSettings,
  MeleeWeaponSettings,
} from '@src/entities/weapon-settings';
import { ArmorType } from '@src/features/active-armor';
import { Size } from '@src/features/size';
import { localize } from '@src/foundry/localization';
import { LabeledFormula, rollLabeledFormulas } from '@src/foundry/rolls';
import { HealthType } from '@src/health/health';
import { SuccessTestResult } from '@src/success-test/success-test';
import { compact, concat, identity, map, pick, pipe, set } from 'remeda';
import type { MeleeWeaponAttack } from './attacks';

interface MeleeDamageInit {
  attack: MeleeWeaponAttack | undefined;
  successTestInfo: {
    result: SuccessTestResult;
    superiorEffects: SuperiorResultEffect[] | undefined;
  };
  augmentUnarmed: boolean | undefined;
  unarmedDV: string | undefined | null;
  damageModifiers: LabeledFormula[] | undefined;
  settings: MeleeWeaponSettings;
  morphSize: Size | null | undefined;
  source: string;
}

export const meleeDamage = ({
  attack,
  successTestInfo,
  augmentUnarmed,
  unarmedDV,
  damageModifiers,
  settings,
  morphSize,
  source,
}: MeleeDamageInit): DamageMessageData => {
  const { result: testResult } = successTestInfo;
  const superiorDamage =
    successTestInfo.superiorEffects?.filter(
      (e) => e === SuperiorResultEffect.Damage,
    ) || [];

  const multiplier = testResult === SuccessTestResult.CriticalSuccess ? 2 : 1;
  const rolled = pipe(
    [
      testResult === SuccessTestResult.SuperiorSuccess &&
        superiorDamage.length >= 1 && {
          label: localize(testResult),
          formula: '+1d6',
        },
      testResult === SuccessTestResult.SuperiorSuccessX2 &&
        superiorDamage.length >= 1 && {
          label: localize(testResult),
          formula: successTestInfo ? `+${superiorDamage.length}d6` : '+2d6',
        },
      (augmentUnarmed || augmentUnarmed == null) && {
        label: localize('unarmedDV'),
        formula: unarmedDV || '0',
      },
      ...formulasFromMeleeSettings(settings),
      ...(damageModifiers ?? []),
    ],
    compact,
    concat(attack?.rollFormulas ?? []),
    morphSize === Size.VerySmall && !settings.damageIrrespectiveOfSize
      ? map(set('formula', '1'))
      : identity,
    rollLabeledFormulas,
  );

  return {
    ...pick(
      attack ?? {
        armorPiercing: false,
        armorUsed: [ArmorType.Kinetic],
        damageType: HealthType.Physical,
        notes: '',
        reduceAVbyDV: false,
      },
      ['armorPiercing', 'armorUsed', 'damageType', 'notes', 'reduceAVbyDV'],
    ),
    source,
    multiplier:
      morphSize === Size.Small && !settings.damageIrrespectiveOfSize
        ? multiplier === 2
          ? 1
          : 0.5
        : multiplier,
    rolledFormulas: rolled,
  };
};
