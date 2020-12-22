import { createMessage } from '@src/chat/create-message';
import { UseWorldTime } from '@src/components/mixins/world-time-mixin';
import type { Character } from '@src/entities/actor/proxies/character';
import { itemMenuOptions } from '@src/entities/item/item-views';
import type { Substance } from '@src/entities/item/proxies/substance';
import { EffectType, formatEffect } from '@src/features/effects';
import { idProp } from '@src/features/feature-helpers';
import { localize } from '@src/foundry/localization';
import { rollLabeledFormulas } from '@src/foundry/rolls';
import { formatDamageType, HealthType } from '@src/health/health';
import { createStressDamage } from '@src/health/health-changes';
import { tooltip } from '@src/init';
import { openMenu } from '@src/open-menu';
import { notEmpty, withSign } from '@src/utility/helpers';
import { customElement, LitElement, property, html } from 'lit-element';
import { classMap } from 'lit-html/directives/class-map';
import { ifDefined } from 'lit-html/directives/if-defined';
import { repeat } from 'lit-html/directives/repeat';
import { compact, pick, uniq } from 'remeda';
import styles from './character-view-active-substance.scss';

@customElement('character-view-active-substance')
export class CharacterViewActiveSubstance extends UseWorldTime(LitElement) {
  static get is() {
    return 'character-view-active-substance' as const;
  }

  static get styles() {
    return [styles];
  }

  @property({ attribute: false }) character!: Character;

  @property({ attribute: false }) substance!: Substance;

  private async rollBaseWearOffStress() {
    const { alwaysApplied, messageHeader, appliedAndHidden } = this.substance;
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
  }

  private async removeSubstance() {
    const { appliedInfo } = this.substance;
    if (!this.substance.appliedInfo.appliedSeverity)
      await this.rollBaseWearOffStress();
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
          header: {
            ...substance.messageHeader,
            hidden: substance.appliedAndHidden,
          },
          damage: {
            ...attack,
            rolledFormulas: rollLabeledFormulas(rollFormulas),
            source: `${substance.appliedName} ${label}`,
            damageType,
            multiplier: notEmpty(modifyingEffects?.misc) ? 0.5 : 1,
          },
        },
        entity: this.character,
      });
    }
    await substance.updateAppliedState({ applySeverity: true });

    if (severity.conditions)
      await this.character.addConditions(severity.conditions);
  }

  private cancelSeverity() {
    this.substance.updateAppliedState({ applySeverity: false });
  }

  private openMenu(ev: MouseEvent) {
    return openMenu({ content: itemMenuOptions(this.substance), position: ev });
  }

  private removeBaseEffects() {
    const { finishedEffects = [] } = this.substance.appliedInfo;
    this.substance.updateAppliedState({
      finishedEffects: uniq(finishedEffects.concat('always')),
    });
  }

  private removeSevereEffects() {
    const { finishedEffects = [] } = this.substance.appliedInfo;
    // TODO undo conditions
    this.substance.updateAppliedState({
      finishedEffects: uniq(finishedEffects.concat('severity')),
    });
  }

  private rollDamageOverTime(index: number) {
    const dot = this.substance.appliedInfo.dots[index]
    if (dot) {
      createMessage({
        data: {
          header: { heading: `${dot.source} ${localize('damageOverTime')}` },
          damage: {
            ...pick(dot, [
              'armorPiercing',
              'armorUsed',
              'reduceAVbyDV',
              'source',
              'multiplier',
              'damageType'
            ]),
            rolledFormulas: rollLabeledFormulas([
              {
                label: localize('damage'),
                formula: dot.formula,
              },
            ]),
            cumulativeDotID: this.substance.id,
          },
        },
        entity: this.character,
      });
    }
  } 

  render() {
    const { disabled } = this.character;
    const { substance } = this;
    const {
      timeState,
      multiTimeStates,
      finishedEffects,
    } = substance.appliedInfo;

    return html`
      ${notEmpty(multiTimeStates)
        ? html`
            <mwc-list-item
              class="name"
              noninteractive
              graphic=${ifDefined(substance.nonDefaultImg ? 'icon' : undefined)}
              hasMeta
            >
              ${substance.nonDefaultImg
                ? html`<img src=${substance.nonDefaultImg} slot="graphic" />`
                : ''}
              <span>${substance.appliedName} </span>
              <mwc-icon-button
                @click=${this.openMenu}
                icon="more_vert"
                slot="meta"
              ></mwc-icon-button>
            </mwc-list-item>
            ${this.renderActions()}
            <sl-animated-list
              class="multi-time ${classMap({
                finished: finishedEffects?.length === 2,
              })}"
              >${repeat(
                multiTimeStates.values(),
                ([nestedTimeState]) => nestedTimeState.id,
                ([nestedTimeState, finished], index) => {
                  if (finished) {
                    return html`
                      <div class="finished">
                        ${localize(index === 0 ? 'base' : 'severe')}
                        ${localize('effects')} ${localize('finished')}
                      </div>
                    `;
                  }
                  return html`<character-view-time-item
                    ?disabled=${disabled}
                    .timeState=${nestedTimeState}
                    completion="expired"
                  >
                    <mwc-icon-button
                      slot="action"
                      class="remove ${classMap({
                        ready: nestedTimeState.completed,
                      })}"
                      icon="remove_circle_outline"
                      @click=${index === 0
                        ? this.removeBaseEffects
                        : this.removeSevereEffects}
                      ?disabled=${disabled}
                    ></mwc-icon-button>
                  </character-view-time-item>`;
                },
              )}</sl-animated-list
            >
          `
        : html`
            <character-view-time-item
              ?disabled=${disabled}
              .timeState=${timeState}
              completion="expired"
              .item=${substance}
            >
            </character-view-time-item>
            ${this.renderActions()}
          `}
    `;
  }

  private renderActions() {
    const { disabled } = this.character;
    const { substance } = this;
    const { alwaysApplied, severity, hasSeverity } = substance;
    const {
      timeState,
      modifyingEffects,
      applySeverity,
      dots,
    } = substance.appliedInfo;
    const mods = compact([
      modifyingEffects?.duration,
      modifyingEffects?.misc,
    ]).flat();
    return html` <sl-animated-list class="active-substance-actions">
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
                ? `& ${localize('roll')} ${localize('SHORT', 'stressValue')} ${
                    alwaysApplied.wearOffStress
                  }`
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

                <span>${localize('SHORT', 'versus').toLocaleLowerCase()}</span>

                ${localize('severe')} ${localize('effects')}
                <button
                  data-tooltip="${localize('apply')} ${localize('effects')}"
                  @mouseover=${tooltip.fromData}
                  ?disabled=${disabled}
                  @click=${this.startSeverity}
                >
                  <mwc-icon>done</mwc-icon>
                </button>
                <button
                  data-tooltip="${localize('resist')} ${localize('effects')}"
                  @mouseover=${tooltip.fromData}
                  ?disabled=${disabled}
                  @click=${this.cancelSeverity}
                >
                  <mwc-icon>block</mwc-icon>
                </button>
              </div>
            `
          : applySeverity === false
          ? html`<span
              >${localize('resisted')} ${localize('severe')}
              ${localize('effects')}</span
            >`
          : ''
        : ''}
      ${dots.map(
        ({ damageType, multiplier, formula }, index) => html`
          <mwc-button dense class="damage" unelevated icon="repeat" trailingIcon @click=${() => this.rollDamageOverTime(index)}
            >${formatDamageType(damageType)}
            ${multiplier === 1
              ? formula
              : `(${formula}) x${multiplier}`}</mwc-button
          >
        `,
      )}
    </sl-animated-list>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'character-view-active-substance': CharacterViewActiveSubstance;
  }
}
