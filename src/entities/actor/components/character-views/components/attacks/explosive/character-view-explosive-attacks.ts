import { createMessage } from '@src/chat/create-message';
import type { ExplosiveSettings } from '@src/chat/message-data';
import {
  formatAreaEffect,
  formatArmorUsed,
} from '@src/combat/attack-formatting';
import type { ExplosiveAttack } from '@src/combat/attacks';
import type { SlWindow } from '@src/components/window/window';
import { openWindow } from '@src/components/window/window-controls';
import { ExplosiveTrigger } from '@src/data-enums';
import type { Character } from '@src/entities/actor/proxies/character';
import type { Explosive } from '@src/entities/item/proxies/explosive';
import { prettyMilliseconds } from '@src/features/time';
import { localize } from '@src/foundry/localization';
import { joinLabeledFormulas } from '@src/foundry/rolls';
import { formatDamageType } from '@src/health/health';
import { openDialog } from '@src/open-dialog';
import { clickIfEnter, notEmpty } from '@src/utility/helpers';
import { customElement, LitElement, property, html } from 'lit-element';
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

  private win: SlWindow | null = null;

  private async createMessage(ev: Event | CustomEvent<ExplosiveSettings>) {
    const { token, character } = requestCharacter(this);
    await createMessage({
      data: {
        header: this.explosive.messageHeader,
        explosiveUse: {
          ...(ev instanceof CustomEvent
            ? ev.detail
            : { trigger: ExplosiveTrigger.Impact }),
          explosive: this.explosive.getDataCopy(),
        },
      },
      entity: token || character,
    });
    this.explosive.consumeUnit();
  }

  render() {
    const {
      attacks,

      sticky,
    } = this.explosive;
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
    `;
  }

  private renderAttack(attack: ExplosiveAttack) {
    const disabled = !this.explosive.editable || this.explosive.quantity === 0;
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

          <div class="additional">
            ${attack.duration
              ? `${localize('lasts')} ${prettyMilliseconds(attack.duration)}`
              : ''}
            ${attack.notes}
          </div>
        </div>
        <div class="actions">
          <button
            slot="base"
            ?disabled=${disabled}
            @keydown=${clickIfEnter}
            @click=${this.openExplosiveSettingsDialog}
          >
            <span>${localize('throw')}</span>
          </button>

          <button
            ?disabled=${disabled}
            @keydown=${clickIfEnter}
            @click=${this.createMessage}
          >
            <span>${localize('plant')}</span>
          </button>
        </div>
      </li>
    `;
  }

  private openExplosiveSettingsDialog(ev: Event) {
    const { token, character } = requestCharacter(this);
    const { win, wasConnected } = openWindow({
      key: ExplosiveSettingsForm,
      name: `${this.explosive.name} ${localize('settings')}`,
      adjacentEl:
        ev.currentTarget instanceof HTMLElement ? ev.currentTarget : this,
      content: html`
        <explosive-settings-form
          .token=${token}
          .character=${character}
          .explosive=${this.explosive}
          requireSubmit
          @explosive-settings=${this.createMessage.bind(this)}
        ></explosive-settings-form>
      `,
    });
  }
}
declare global {
  interface HTMLElementTagNameMap {
    'character-view-explosive-attacks': CharacterViewExplosiveAttacks;
  }
}
