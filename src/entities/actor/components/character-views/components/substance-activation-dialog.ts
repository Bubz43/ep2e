import type { MultiSelectedEvent } from '@material/mwc-list/mwc-list-foundation';
import type { Character } from '@src/entities/actor/proxies/character';
import type { Substance } from '@src/entities/item/proxies/substance';
import { Source, formatEffect } from '@src/features/effects';
import { localize } from '@src/foundry/localization';
import {
  formatDamageType,
  formatFormulaWithMultiplier,
} from '@src/health/health';
import { notEmpty } from '@src/utility/helpers';
import { html } from 'lit-html';
import { compact, map, pipe, prop } from 'remeda';

export const substanceActivationDialog = (
  character: Character,
  substance: Substance,
) => {
  const { alwaysApplied } = substance;
  const { substanceModifiers } = character.appliedEffects;
  const modifiers = Object.values(substanceModifiers).flat();
  let usingEffects: number[] = [];

  // const { hasInstantDamage } = alwaysApplied;

  /*
<ul
      style="display: grid;
    justify-content: end; margin: 0.5rem 0;"
    >
      ${hasInstantDamage
        ? html`
            <li>
              ${localize('roll')}
              ${formatDamageType(alwaysApplied.damage.damageType)}
              ${alwaysApplied.damage.rollFormulas
                .map(prop('formula'))
                .join('+')}
              [${localize('beforeModifiers')}]
            </li>
          `
        : ''}
    </ul> 
  */
  return html` <mwc-dialog
    heading="${localize('activate')} ${substance.appliedName}"
  >
    ${notEmpty(modifiers)
      ? html`
          <mwc-list
            multi
            @selected=${(ev: MultiSelectedEvent) =>
              (usingEffects = [...ev.detail.index])}
          >
            <mwc-list-item noninteractive>
              ${localize('modifiers')}</mwc-list-item
            >
            <li divider style="border-color: var(--color-border);"></li>
            ${modifiers.map(
              (effect) => html`
                <mwc-check-list-item twoline>
                  <span>${effect[Source]}</span>
                  <span slot="secondary">${formatEffect(effect)}</span>
                </mwc-check-list-item>
              `,
            )}
          </mwc-list>
        `
      : ''}


    <mwc-button slot="secondaryAction" dialogAction="cancel"
      >${localize('cancel')}</mwc-button
    >
    <mwc-button
      raised
      slot="primaryAction"
      dialogAction="start"
      @click=${() => {
        pipe(
          usingEffects,
          map((index) => modifiers[index]),
          compact,
          (effects) => substance.makeActive(effects),
        );
      }}
      >${localize('start')}</mwc-button
    >
  </mwc-dialog>`;
};
