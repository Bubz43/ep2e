import * as v from '@badrap/valita';
import { createMessage, rollModeToVisibility } from './chat/create-message';
import type { DamageMessageData } from './chat/message-data';
import { ArmorType } from './features/active-armor';
import { NotificationType, notify } from './foundry/foundry-apps';
import {
  isValidFormula,
  LabeledFormula,
  rollLabeledFormulas,
} from './foundry/rolls';
import { HealthType } from './health/health';
import { vEnum } from './utility/v-enum';

// ! Make sure to validate all passed in data

export type CustomAttackData = Pick<
  DamageMessageData,
  'source' | 'damageType' | 'armorUsed' | 'armorPiercing' | 'reduceAVbyDV'
> & {
  formulas: LabeledFormula[];
};

const attack: v.Type<CustomAttackData> = v.object({
  source: v.string().assert((v) => !!v.length, 'cannot be empty'),
  damageType: vEnum(HealthType),
  armorUsed: v.array(vEnum(ArmorType)),
  armorPiercing: v.boolean().optional(),
  reduceAVbyDV: v.boolean().optional(),
  formulas: v.array(
    v.object({
      label: v.string(),
      formula: v.string().assert(isValidFormula),
    }),
  ),
});

const rollCustomAttack = (data: unknown) => {
  try {
    // Destructure to omit any additional keys
    const {
      source,
      damageType,
      armorUsed,
      armorPiercing,
      reduceAVbyDV,
      formulas,
    } = attack.parse(data);
    const rolledFormulas = rollLabeledFormulas(formulas);
    createMessage({
      data: {
        header: { heading: source },
        damage: {
          damageType,
          source,
          armorUsed,
          armorPiercing,
          reduceAVbyDV,
          rolledFormulas,
        },
      },
      visibility: rollModeToVisibility(game.settings.get('core', 'rollMode')),
    });
  } catch (error) {
    notify(NotificationType.Error, `Invalid custom attack: ${error.message}`);
    console.log(error);
    return;
  }
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
