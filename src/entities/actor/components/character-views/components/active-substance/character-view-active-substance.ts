import { createMessage } from '@src/chat/create-message';
import type { Character } from '@src/entities/actor/proxies/character';
import type { Substance } from '@src/entities/item/proxies/substance';
import { EffectType, formatEffect } from '@src/features/effects';
import { localize } from '@src/foundry/localization';
import { rollLabeledFormulas } from '@src/foundry/rolls';
import { HealthType } from '@src/health/health';
import { createStressDamage } from '@src/health/health-changes';
import { tooltip } from '@src/init';
import { notEmpty, withSign } from '@src/utility/helpers';
import { customElement, LitElement, property, html } from 'lit-element';
import { classMap } from 'lit-html/directives/class-map';
import { compact } from 'remeda';
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
    const {
      alwaysApplied,
      severity,
      messageHeader,
      appliedAndHidden,
    } = this.substance;
    if (alwaysApplied.wearOffStress) {
      await createMessage({
        data: {
          header: { ...messageHeader, hidden: appliedAndHidden },
          damage: {
            rolledFormulas: rollLabeledFormulas([
              {
                label: localize('wearOffStress'),
                formula: alwaysApplied.wearOffStress,
              },
            ]),
            damageType: HealthType.Mental,
            source: this.substance.appliedName,
          },
        },
        entity: this.character,
      });
    }
    this.substance.deleteSelf?.();
  }

  private async startSeverity() {
    const { substance } = this;
    const { severity } = substance;
    if (severity.hasInstantDamage) {
      const { modifyingEffects } = substance.appliedInfo;
      const {
        label,
        damageType,
        attackTraits,
        perTurn,
        rollFormulas,
        ...attack
      } = severity.damage;

      await createMessage({
        data: {
          header: { ...substance.messageHeader, hidden: substance.appliedAndHidden },
          damage: {
            ...attack,
            rolledFormulas: rollLabeledFormulas(rollFormulas),
            source: `${substance.appliedName} ${label}`,
            damageType,
            multiplier: notEmpty(modifyingEffects?.misc)
              ? 0.5
              : 1,
          },
        },
        entity: this.character,
      });
    }
    this.substance.updateAppliedState({ applySeverity: true });
  }

  private cancelSeverity() {
    this.substance.updateAppliedState({ applySeverity: false });
  }

  render() {
    const { disabled } = this.character;
    const { substance } = this;
    const { alwaysApplied, severity, hasSeverity } = substance;
    const {
      timeState,
      modifyingEffects,
      applySeverity,
    } = substance.appliedInfo;
    const mods = compact([
      modifyingEffects?.duration,
      modifyingEffects?.misc,
    ]).flat();
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
                dense
                raised
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
        ${hasSeverity
          ? applySeverity === null
            ? html`
                <div class="severe-effects">
                  <mwc-button
                    ?disabled=${disabled}
                    dense
                    class="check"
                    icon="check_circle"
                    unelevated
                    trailingIcon
                  >
                    ${localize(severity.check)}
                    ${severity.checkMod ? withSign(severity.checkMod) : ''}
                  </mwc-button>

                  <span
                    >${localize('SHORT', 'versus').toLocaleLowerCase()}</span
                  >

                  ${localize('severe')} ${localize('effects')}
                  <button
                  data-tooltip="${localize("apply")} ${localize("effects")}"
                  @mouseover=${tooltip.fromData}
                    ?disabled=${disabled}
                    @click=${this.startSeverity}
                  >
                    <mwc-icon>done</mwc-icon>
                  </button>
                  <button
                  data-tooltip="${localize("resist")} ${localize("effects")}"
                  @mouseover=${tooltip.fromData}
                    ?disabled=${disabled}
                    @click=${this.cancelSeverity}
                  >
                    <mwc-icon>block</mwc-icon>
                  </button>
                </div>
              `
            : html`<span
                >${localize(applySeverity ? 'applied' : 'resisted')}
                ${localize('severe')} ${localize('effects')}</span
              >`
          : ''}
        ${notEmpty(mods)
          ? html`
              <sl-popover
                class="mods"
                .renderOnDemand=${() =>
                  html`<ul>
                    ${mods.map(
                      (effect) => html`<li>${formatEffect(effect)}</li>`,
                    )}
                  </ul>`}
              >
                <mwc-button slot="base" dense
                  >${localize('SHORT', 'modifiers')}</mwc-button
                >
              </sl-popover>
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
