import type { FirearmAmmoModeData } from '@src/combat/attacks';
import { FirearmAmmoModifierType } from '@src/data-enums';
import { localize } from '@src/foundry/localization';
import { notEmpty } from '@src/utility/helpers';
import { html } from 'lit-html';
import { map, compact } from 'remeda';

export const firearmAmmoDetails = ({
  damageModifierType,
  notes,
  damageFormula,
  steady,
  armorPiercing,
  attackTraits,
}: FirearmAmmoModeData) => {
  return html`
    <sl-group label="${localize('damageValue')} ${localize('modifier')}">
      ${damageModifierType === FirearmAmmoModifierType.NoDamage
        ? localize(damageModifierType)
        : damageModifierType === 'halve'
        ? '÷2'
        : damageFormula || '-'}
    </sl-group>
    ${steady || armorPiercing || notEmpty(attackTraits)
      ? html`
          <sl-group label=${localize('traits')}>
            ${map(
              compact([
                steady && 'steady',
                armorPiercing && 'armorPiercing',
                ...attackTraits,
              ]),
              localize,
            ).join(', ')}
          </sl-group>
        `
      : ''}
    ${notes
      ? html` <sl-group label=${localize('notes')}>${notes}</sl-group> `
      : ''}
  `;
};
