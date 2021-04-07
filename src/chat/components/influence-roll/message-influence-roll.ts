import type { InfluenceRollData } from '@src/chat/message-data';
import { ActorType } from '@src/entities/entity-types';
import { toMilliseconds } from '@src/features/modify-milliseconds';
import {
  InfluenceRoll,
  influenceRolls,
  PsiInfluenceType,
} from '@src/features/psi-influence';
import { NotificationType, notify } from '@src/foundry/foundry-apps';
import { localize } from '@src/foundry/localization';
import { rollFormula, rollLabeledFormulas } from '@src/foundry/rolls';
import { HealthType } from '@src/health/health';
import { customElement, html, property } from 'lit-element';
import { clamp } from 'remeda';
import { MessageElement } from '../message-element';
import styles from './message-influence-roll.scss';

@customElement('message-influence-roll')
export class MessageInfluenceRoll extends MessageElement {
  static get is() {
    return 'message-influence-roll' as const;
  }

  static get styles() {
    return [styles];
  }

  @property({ type: Object }) influenceRoll!: InfluenceRollData;

  get clampedRoll() {
    return clamp(this.influenceRoll.rollData.total, {
      min: 1,
      max: 6,
    }) as InfluenceRoll;
  }

  private reroll() {
    const roll = rollFormula(this.influenceRoll.rollData.formula);
    if (roll) {
      this.getUpdater('influenceRoll').commit({ rollData: roll.toJSON() });
    }
  }

  private get influenceAlreadyActive() {
    const { actor } = this.message;
    if (actor?.proxy.type === ActorType.Character) {
      const { psi } = actor.proxy;
      return !!psi?.fullInfluences[this.clampedRoll].timeState;
    }
    return false;
  }

  private async applyInfluence(extendDuration: boolean) {
    const { actor } = this.message;
    const { influenceAlreadyActive } = this;
    const applied = influenceAlreadyActive
      ? extendDuration
        ? 'extended'
        : 'refreshed'
      : 'applied';
    if (actor?.proxy.type === ActorType.Character) {
      const { psi } = actor.proxy;
      const { clampedRoll: influenceRoll } = this;
      const influence = psi?.fullInfluences[influenceRoll];
      if (!influence || !psi) {
        notify(
          NotificationType.Info,
          `${localize('influence')} ${localize('missing')}`,
        );
        return;
      }

      switch (influence.type) {
        case PsiInfluenceType.Damage: {
          const rolledFormulas = rollLabeledFormulas([
            { label: localize('influence'), formula: influence.formula },
          ]);
          this.message.createSimilar({
            damage: {
              rolledFormulas,
              damageType: HealthType.Physical,
              source: `${psi.name} - ${localize(influence.type)} ${localize(
                'influence',
              )}`,
            },
          });
          this.getUpdater('influenceRoll').commit({ applied });
          break;
        }

        case PsiInfluenceType.Motivation: {
          const roll = rollFormula(`1d6`);

          await psi.activateInfluence(
            influenceRoll,
            toMilliseconds({ hours: roll?.total || 1 }),
            extendDuration,
          );
          roll?.toMessage({
            flavor: localize('hours'),
            speaker: this.message.data.speaker,
          });
          this.getUpdater('influenceRoll').commit({ applied });

          break;
        }

        case PsiInfluenceType.Trait: {
          const roll = rollFormula(`1d6 #${localize('minutes')}`);

          await psi.activateInfluence(
            influenceRoll,
            toMilliseconds({ minutes: roll?.total || 1 }),
            extendDuration,
          );
          roll?.toMessage({
            flavor: localize('minutes'),
            speaker: this.message.data.speaker,
          });
          this.getUpdater('influenceRoll').commit({ applied });

          break;
        }

        case PsiInfluenceType.Unique: {
          this.getUpdater('influenceRoll').commit({ applied });

          break;
        }
      }
    }
  }

  render() {
    const { total, formula } = this.influenceRoll.rollData;
    const { influences, applied } = this.influenceRoll;
    const { disabled, clampedRoll } = this;
    return html`
      <div class="roll">
        <span>${formula}</span>
        <span>${total}</span>
      </div>
      <mwc-list>
        ${influenceRolls.map(
          (roll) => html`
            <mwc-list-item
              class=${roll === clampedRoll ? 'active' : ''}
              noninteractive
              >[${roll}${roll === 6 ? '+' : ''}]
              ${influences[roll].name}</mwc-list-item
            >
          `,
        )}
      </mwc-list>
      ${this.influenceAlreadyActive && !applied
        ? html`
            <p class="already-active-label">
              ${localize('influence')} ${localize('active')}
            </p>
            <div class="active-options">
              <mwc-button ?disabled=${disabled} dense @click=${this.reroll}
                >${localize('reRoll')}</mwc-button
              >
              <mwc-button
                ?disabled=${disabled}
                dense
                @click=${() => this.applyInfluence(true)}
                >${localize('extend')} ${localize('duration')}</mwc-button
              >
              <mwc-button
                ?disabled=${disabled}
                dense
                @click=${() => this.applyInfluence(false)}
                >${localize('refresh')} ${localize('duration')}</mwc-button
              >
            </div>
          `
        : html`
            <div class="active-options">
              <mwc-button
                @click=${() => this.applyInfluence(false)}
                ?disabled=${disabled || !!applied}
                >${localize(applied ? applied : 'apply')}
                ${localize('influence')}</mwc-button
              >
            </div>
          `}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'message-influence-roll': MessageInfluenceRoll;
  }
}
