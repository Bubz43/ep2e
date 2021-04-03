import { createMessage, rollModeToVisibility } from './chat/create-message';
import type { DamageMessageData } from './chat/message-data';
import { LabeledFormula, rollLabeledFormulas } from './foundry/rolls';

const rollCustomAttack = (
  damage: Omit<DamageMessageData, 'rolledFormulas'> & {
    formulas: LabeledFormula[];
  },
) => {
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
