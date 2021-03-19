import type { InfluenceRollData } from '@src/chat/message-data';
import { ActorType } from '@src/entities/entity-types';
import {
  InfluenceRoll,
  influenceRolls,
  PsiInfluenceType,
} from '@src/features/psi-influence';
import { NotificationType, notify } from '@src/foundry/foundry-apps';
import { localize } from '@src/foundry/localization';
import { rollLabeledFormulas } from '@src/foundry/rolls';
import { HealthType } from '@src/health/health';
import { customElement, html, property } from 'lit-element';
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

  private applyInfluence() {
    const { actor } = this.message;
    if (actor?.proxy.type === ActorType.Character) {
      const { psi } = actor.proxy;
      const influence =
        psi?.fullInfluences[this.influenceRoll.rollData.total as InfluenceRoll];
      if (!influence || !psi) {
        notify(
          NotificationType.Info,
          `${localize('influence')} ${localize('missing')}`,
        );
        return;
      }
      if (influence.type === PsiInfluenceType.Damage) {
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
      }
    }
  }

  render() {
    const { total } = this.influenceRoll.rollData;
    const { influences } = this.influenceRoll;
    return html`
      <mwc-list>
        ${influenceRolls.map((roll) => {
          const selected = roll === total;
          return html`
            <mwc-list-item
              ?selected=${selected}
              ?noninteractive=${!selected}
              @click=${this.applyInfluence}
              >[${roll}] ${influences[roll].name}</mwc-list-item
            >
          `;
        })}
      </mwc-list>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'message-influence-roll': MessageInfluenceRoll;
  }
}
