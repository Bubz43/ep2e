import { createMessage } from '@src/chat/create-message';
import {
  formatAreaEffect,
  formatArmorUsed,
} from '@src/combat/attack-formatting';
import type { ExplosiveAttack } from '@src/combat/attacks';
import type { SlWindow } from '@src/components/window/window';
import { openWindow } from '@src/components/window/window-controls';
import { ExplosiveTrigger, ExplosiveType } from '@src/data-enums';
import {
  createExplosiveTriggerSetting,
  ExplosiveSettings,
} from '@src/entities/explosive-settings';
import type { Explosive } from '@src/entities/item/proxies/explosive';
import { prettyMilliseconds } from '@src/features/time';
import { localize } from '@src/foundry/localization';
import { joinLabeledFormulas } from '@src/foundry/rolls';
import { formatDamageType } from '@src/health/health';
import { clickIfEnter, notEmpty } from '@src/utility/helpers';
import { customElement, html, LitElement, property } from 'lit-element';
import { map } from 'remeda';
import { requestCharacter } from '../../../character-request-event';
import { ExplosiveSettingsForm } from '../explosive-settings/explosive-settings-form';
import styles from './character-view-explosive-attacks.scss';

@customElement('character-view-explosive-attacks')
export class CharacterViewExplosiveAttacks extends LitElement {
  static get is() {
    return 'character-view-explosive-attacks' as const;
  }

  static get styles() {
    return [styles];
  }

  @property({ attribute: false }) explosive!: Explosive;

  private async createMessage(ev: Event | CustomEvent<ExplosiveSettings>) {
    const { token, character } = requestCharacter(this);
    await createMessage({
      data: {
        header: this.explosive.messageHeader,
        explosiveUse: {
          ...(ev instanceof CustomEvent
            ? ev.detail
            : {
                trigger: createExplosiveTriggerSetting(ExplosiveTrigger.Signal),
              }),
          explosive: this.explosive.getDataCopy(),
        },
      },
      entity: token || character,
    });
    this.explosive.consumeUnit();
  }

  render() {
    const { attacks, editable, sticky } = this.explosive;
    // TODO Place template choose trigger etc
    return html`
  
      <ul class="attacks">
        ${this.renderAttack(attacks.primary)}
        ${attacks.secondary ? this.renderAttack(attacks.secondary) : ''}
      </ul>
      <div class="shared">
        ${sticky ? html`<div>${localize('sticky')}</div>` : ''}
        <div class="area-effect">
          ${localize('areaEffect')}
          <span class="area-values"> ${formatAreaEffect(this.explosive)} </span>
        </div>
      </div>
      
      <div class="actions">
        ${this.explosive.explosiveType === ExplosiveType.Grenade
          ? html`
              <mwc-button
                dense
                ?disabled=${!editable}
                @click=${this.openExplosiveSettingsDialog}
              >
                <span>${localize('throw')}</span>
              </mwc-button>
            `
          : ''}

        <mwc-button
          dense
          ?disabled=${!editable}
          @click=${this.openExplosivePlacingWindow}
        >
          <span>${localize('place')}</span>
        </mwc-button>
      </div>
    `;
  }

  private renderAttack(attack: ExplosiveAttack) {
    return html`
      <li>
        <div class="info">
          ${this.explosive.hasSecondaryMode
            ? html` <div class="label">${attack.label}</div> `
            : ''}
          <div class="main">
            ${notEmpty(attack.rollFormulas)
              ? html`
                  ${formatDamageType(attack.damageType)}
                  ${joinLabeledFormulas(attack.rollFormulas)}
                  ${formatArmorUsed(attack)}.
                `
              : ''}
            ${map(attack.attackTraits, localize).join(', ')}
          </div>

          ${attack.substance
            ? html`
                <div class="substance">
                  ${attack.substance.name}
                  <span class="type">${attack.substance.fullType}</span>
                </div>
              `
            : ''}

          <div class="additional">
            ${attack.duration
              ? `${localize('lasts')} ${prettyMilliseconds(attack.duration)}`
              : ''}
            ${attack.notes}
          </div>
        </div>
      </li>
    `;
  }

  private openExplosivePlacingWindow(ev: Event) {
    const initialSettings = { placing: true };
    const { win, wasConnected } = ExplosiveSettingsForm.openWindow({
      explosive: this.explosive,
      requireSubmit: true,
      update: this.createMessage.bind(this),
      initialSettings,
    });
  }

  private openExplosiveSettingsDialog(ev: Event) {
    const blah = ExplosiveSettingsForm.openWindow({
      explosive: this.explosive,
      requireSubmit: true,
      update: this.createMessage.bind(this),
    });
  }
}
declare global {
  interface HTMLElementTagNameMap {
    'character-view-explosive-attacks': CharacterViewExplosiveAttacks;
  }
}
