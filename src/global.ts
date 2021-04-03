import { createMessage, rollModeToVisibility } from './chat/create-message';
import type { DamageMessageData } from './chat/message-data';
import { enumValues } from './data-enums';
import { ArmorType } from './features/active-armor';
import { NotificationType, notify } from './foundry/foundry-apps';
import { LabeledFormula, rollLabeledFormulas } from './foundry/rolls';
import { HealthType } from './health/health';
import { isJsonObject } from './utility/helpers';

// ! Make sure to validate all passed in data

type CustomAttackData = Pick<
  DamageMessageData,
  'source' | 'damageType' | 'armorUsed' | 'armorPiercing' | 'reduceAVbyDV'
> & {
  formulas: LabeledFormula[];
};

const isValidCustomAttack = (data: unknown): data is CustomAttackData => {
  try {
    const obj = isJsonObject(data) && (data as Partial<CustomAttackData>);
    if (!obj) return false;
    console.log(enumValues(HealthType).includes(obj.damageType!));
    return !!(
      typeof obj.source === 'string' &&
      obj.source &&
      obj.formulas?.length &&
      obj.formulas?.every(
        (pair) => pair.label && Roll.validate(pair.formula),
      ) &&
      enumValues(HealthType).includes(obj.damageType!) &&
      obj.armorUsed?.every((type) => enumValues(ArmorType).includes(type)) &&
      (!obj.armorPiercing || typeof obj.armorPiercing === 'boolean') &&
      (!obj.reduceAVbyDV || typeof obj.reduceAVbyDV === 'boolean')
    );
  } catch (error) {
    console.log(error);
    return false;
  }
};

const rollCustomAttack = (damage: CustomAttackData) => {
  if (!isValidCustomAttack(damage)) {
    notify(NotificationType.Error, 'Invalid custom attack');
    return;
  }
  // console.log(enumValues(HealthType).includes(damage.damageType!));
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
