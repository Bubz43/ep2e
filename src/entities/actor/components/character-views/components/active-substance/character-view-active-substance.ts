import { createMessage } from '@src/chat/create-message';
import type { Character } from '@src/entities/actor/proxies/character';
import type { Substance } from '@src/entities/item/proxies/substance';
import { localize } from '@src/foundry/localization';
import { rollLabeledFormulas } from '@src/foundry/rolls';
import { HealthType } from '@src/health/health';
import { createStressDamage } from '@src/health/health-changes';
import { customElement, LitElement, property, html } from 'lit-element';
import { classMap } from 'lit-html/directives/class-map';
import styles from './character-view-active-substance.scss';

@customElement('character-view-active-substance')
export class CharacterViewActiveSubstance extends LitElement {
  static get is() {
    return 'character-view-active-substance' as const;
  }

  static get styles() {
    return [styles];
  }

  @property({ attribute: false }) character!: Character;

  @property({ attribute: false }) substance!: Substance;

  private async removeSubstance() {
    const { alwaysApplied, severity, messageHeader, appliedAndHidden } = this.substance;
    if (alwaysApplied.wearOffStress) {
      await createMessage({
        data: {
          header: { ...messageHeader, hidden: appliedAndHidden },
          damage: {
            rolledFormulas: rollLabeledFormulas([{ label: localize("wearOffStress"), formula: alwaysApplied.wearOffStress }]),
            damageType: HealthType.Mental,
            source: this.substance.appliedName,
          }
        },
        entity: this.character
      })
    }
    this.substance.deleteSelf?.();
  }

  render() {
    const { disabled } = this.character;
    const { substance } = this;
    const { alwaysApplied, severity } = substance;
    const { timeState } = substance.appliedInfo;

    return html`
      <character-view-time-item
        ?disabled=${disabled}
        .timeState=${timeState}
        completion="expired"
        .item=${substance}
      >
      </character-view-time-item>
      <sl-animated-list class="active-substance-actions">
        ${timeState.completed
          ? html`
              <mwc-button
              @click=${this.removeSubstance}
              ?disabled=${disabled}
                class=${classMap({ damage: !!alwaysApplied.wearOffStress })}
              >
                ${localize('remove')}
                ${alwaysApplied.wearOffStress
                  ? `& ${localize('roll')} ${localize(
                      'SHORT',
                      'stressValue',
                    )} ${alwaysApplied.wearOffStress}`
                  : ''}
              </mwc-button>
            `
          : ''}
      </sl-animated-list>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'character-view-active-substance': CharacterViewActiveSubstance;
  }
}
