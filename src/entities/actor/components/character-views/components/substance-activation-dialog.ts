import type { MultiSelectedEvent } from '@material/mwc-list/mwc-list-foundation';
import type { Character } from '@src/entities/actor/proxies/character';
import type { Substance } from '@src/entities/item/proxies/substance';
import { Source, formatEffect } from '@src/features/effects';
import { localize } from '@src/foundry/localization';
import { html } from 'lit-html';
import { compact } from 'remeda';

export const substanceActivationDialog = (
  character: Character,
  substance: Substance,
) => {
  const { substanceEffects } = character.appliedEffects;

  // if (substanceEffects.length === 0) {
  //   substance.makeActive([]);
  //   return;
  // }

  let usingEffects: number[] = [];

  return html` <mwc-dialog
    heading="${localize('activate')} ${substance.appliedName}"
  >
    <mwc-list
      multi
      @selected=${(ev: MultiSelectedEvent) =>
        (usingEffects = [...ev.detail.index])}
    >
      ${substanceEffects.map((effect) => {
        return html`
          <mwc-check-list-item twoline>
            <span>${effect[Source]}</span>
            <span slot="secondary">${formatEffect(effect)}</span>
          </mwc-check-list-item>
        `;
      })}
    </mwc-list>

    <mwc-button slot="secondaryAction" dialogAction="cancel"
      >${localize('cancel')}</mwc-button
    >
    <mwc-button
      raised
      slot="primaryAction"
      dialogAction="start"
      @click=${() => {
        const finalEffects = compact(
          usingEffects.map((index) => substanceEffects[index]),
        );
        substance.makeActive(finalEffects);
      }}
      >${localize('start')}</mwc-button
    >
  </mwc-dialog>`;
};
