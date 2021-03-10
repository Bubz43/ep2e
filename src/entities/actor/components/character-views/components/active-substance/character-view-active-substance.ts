import type { MultiSelectedEvent } from '@material/mwc-list/mwc-list-foundation';
import { createMessage } from '@src/chat/create-message';
import { UseWorldTime } from '@src/components/mixins/world-time-mixin';
import type { Character } from '@src/entities/actor/proxies/character';
import { ActorType } from '@src/entities/entity-types';
import { itemMenuOptions } from '@src/entities/item/item-views';
import type { Substance } from '@src/entities/item/proxies/substance';
import { formatEffect } from '@src/features/effects';
import { localize } from '@src/foundry/localization';
import { rollLabeledFormulas } from '@src/foundry/rolls';
import { formatDamageType, HealthType } from '@src/health/health';
import { tooltip } from '@src/init';
import { RenderDialogEvent } from '@src/open-dialog';
import { openMenu } from '@src/open-menu';
import { AptitudeCheckControls } from '@src/success-test/components/aptitude-check-controls/aptitude-check-controls';
import { createSuccessTestModifier } from '@src/success-test/success-test';
import { notEmpty, withSign } from '@src/utility/helpers';
import { customElement, html, LitElement, property } from 'lit-element';
import { classMap } from 'lit-html/directives/class-map';
import { ifDefined } from 'lit-html/directives/if-defined';
import { repeat } from 'lit-html/directives/repeat';
import { compact, difference, pick, uniq } from 'remeda';
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

  private async rollWearOffStress(group: 'base' | 'severity') {
    const { messageHeader, appliedAndHidden } = this.substance;
    const data = this.substance[group];
    if (data.wearOffStress) {
      await createMessage({
        data: {
          header: { ...messageHeader, hidden: appliedAndHidden },
          damage: {
            rolledFormulas: rollLabeledFormulas([
              {
                label: localize('wearOffStress'),
                formula: data.wearOffStress,
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
    if (!this.substance.appliedInfo.appliedSeverity)
      await this.rollWearOffStress('base');
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

  private startSeverityCheck(
    severity: Pick<Substance['severity'], 'check' | 'checkMod'>,
  ) {
    AptitudeCheckControls.openWindow({
      entities: { actor: this.character.actor },
      getState: (actor) => {
        if (actor.proxy.type !== ActorType.Character) return null;

        return {
          ego: actor.proxy.ego,
          character: actor.proxy,
          aptitude: severity.check,
          modifiers: severity.checkMod
            ? [
                createSuccessTestModifier({
                  name: `${localize('severity')}`,
                  value: severity.checkMod,
                }),
              ]
            : undefined,
        };
      },
    });
  }

  private async endBaseEffects() {
    const { finishedEffects = [] } = this.substance.appliedInfo;
    if (!this.substance.appliedInfo.appliedSeverity) {
      await this.rollWearOffStress('base');
    }

    if (finishedEffects.includes('severity')) this.removeSubstance();
    else {
      this.substance.updateAppliedState({
        finishedEffects: uniq(finishedEffects.concat('base')),
      });
    }
  }

  private async endSevereEffects() {
    const { finishedEffects = [], conditions } = this.substance.appliedInfo;
    if (!this.substance.appliedInfo.appliedSeverity) {
      await this.rollWearOffStress('severity');
    }

    const cleanup = async () => {
      if (finishedEffects.includes('base')) await this.removeSubstance();
      else {
        await this.substance.updateAppliedState({
          finishedEffects: uniq(finishedEffects.concat('severity')),
        });
      }
    };

    if (notEmpty(conditions)) {
      let removedConditions = new Set<number>();
      this.dispatchEvent(
        new RenderDialogEvent(html`
          <mwc-dialog
            heading="${localize('end')}
            ${localize('severe')}
            ${localize('effects')}"
          >
            <mwc-list
              multi
              @selected=${(ev: MultiSelectedEvent) =>
                (removedConditions = ev.detail.index)}
            >
              <mwc-list-item noninteractive
                >${localize('remove')} ${localize('conditions')}</mwc-list-item
              >
              <li divider style="--border-color: var(--color-border);"></li>
              ${conditions.map(
                (condition) => html`
                  <mwc-check-list-item selected
                    >${localize(condition)}</mwc-check-list-item
                  >
                `,
              )}
            </mwc-list>
            <mwc-button slot="secondaryAction" dialogAction="cancel"
              >${localize('cancel')}</mwc-button
            >
            <mwc-button
              unelevated
              slot="primaryAction"
              dialogAction="save"
              @click=${async () => {
                await cleanup();
                const conditionsToRemove = compact(
                  [...removedConditions].map((index) => conditions[index]),
                );
                if (notEmpty(conditionsToRemove)) {
                  this.character.updateConditions(
                    difference(this.character.conditions, conditionsToRemove),
                  );
                }
              }}
              >${localize('end')}</mwc-button
            >
          </mwc-dialog>
        `),
      );
    } else cleanup();
  }

  private rollDamageOverTime(index: number) {
    const dot = this.substance.appliedInfo.dots[index];
    if (dot) {
      createMessage({
        data: {
          header: {
            heading: this.substance.appliedName,
            subheadings: `${localize('damage')} ${localize('perTurn')}`,
          },
          damage: {
            ...pick(dot, [
              'armorPiercing',
              'armorUsed',
              'reduceAVbyDV',
              'source',
              'multiplier',
              'damageType',
            ]),
            rolledFormulas: rollLabeledFormulas([
              {
                label: localize('damage'),
                formula: dot.formula,
              },
            ]),
            cumulativeDotID: this.substance.id,
            source: this.substance.appliedName,
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
                  return html`<time-state-item
                    ?disabled=${disabled}
                    .timeState=${nestedTimeState}
                    completion="expired"
                  >
                    <mwc-icon-button
                      slot="action"
                      data-tooltip="${localize('end')} ${localize('effects')}"
                      @mouseover=${tooltip.fromData}
                      class="remove ${classMap({
                        ready: nestedTimeState.completed,
                      })}"
                      icon="remove_circle_outline"
                      @click=${index === 0
                        ? this.endBaseEffects
                        : this.endSevereEffects}
                      ?disabled=${disabled}
                    ></mwc-icon-button>
                  </time-state-item>`;
                },
              )}</sl-animated-list
            >
          `
        : html`
            <time-state-item
              ?disabled=${disabled}
              .timeState=${timeState}
              completion="expired"
              .item=${substance}
            >
            </time-state-item>
          `}
      ${this.renderActions()}
    `;
  }

  private renderActions() {
    const { disabled } = this.character;
    const { substance } = this;
    const { base: alwaysApplied, severity, hasSeverity } = substance;
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
      ${!applySeverity && timeState.completed
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
                  @click=${() => this.startSeverityCheck(severity)}
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
          ? html`<colored-tag type="info"
              >${localize('resisted')} ${localize('severe')}
              ${localize('effects')}</colored-tag
            >`
          : ''
        : ''}
      ${dots.map(
        ({ damageType, multiplier, formula }, index) => html`
          <mwc-button
            dense
            class="damage"
            unelevated
            icon="repeat"
            trailingIcon
            @click=${() => this.rollDamageOverTime(index)}
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
