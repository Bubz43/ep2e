import * as v from '@badrap/valita';
import { createMessage, rollModeToVisibility } from './chat/create-message';
import type { DamageMessageData } from './chat/message-data';
import { ArmorType } from './features/active-armor';
import { NotificationType, notify } from './foundry/foundry-apps';
import {
  LabeledFormula,
  rollLabeledFormulas,
  validateFormula,
} from './foundry/rolls';
import { HealthType } from './health/health';
import { vEnum } from './utility/v-enum';

// ! Make sure to validate all passed in data

type CustomAttackData = Pick<
  DamageMessageData,
  'source' | 'damageType' | 'armorUsed' | 'armorPiercing' | 'reduceAVbyDV'
> & {
  formulas: LabeledFormula[];
};

const damageSchema: v.Type<CustomAttackData> = v.object({
  source: v.string(),
  damageType: vEnum(HealthType),
  armorUsed: v.array(vEnum(ArmorType)),
  armorPiercing: v.boolean().optional(),
  reduceAVbyDV: v.boolean().optional(),
  formulas: v.array(
    v.object({
      label: v.string(),
      formula: v.string().assert(validateFormula),
    }),
  ),
});

const rollCustomAttack = (damage: CustomAttackData) => {
  try {
    damageSchema.parse(damage);
  } catch (error) {
    notify(NotificationType.Error, 'Invalid custom attack');
    console.log(error);
    return;
  }

  const rolledFormulas = rollLabeledFormulas(damage.formulas);
  createMessage({
    data: {
      header: { heading: damage.source },
      damage: { ...damage, rolledFormulas },
    },
    visibility: rollModeToVisibility(game.settings.get('core', 'rollMode')),
  });
};

window.ep2e = {
  rollCustomAttack,
};

declare global {
  interface Window {
    ep2e: {
      rollCustomAttack: typeof rollCustomAttack;
    };
  }
}
