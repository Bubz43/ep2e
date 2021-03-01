import { createMessage } from '@src/chat/create-message';
import {
  formatAreaEffect,
  formatArmorUsed,
} from '@src/combat/attack-formatting';
import type { ExplosiveAttack } from '@src/combat/attacks';
import type { SlWindow } from '@src/components/window/window';
import { ExplosiveTrigger, ExplosiveType } from '@src/data-enums';
import type { Explosive } from '@src/entities/item/proxies/explosive';
import {
  createExplosiveTriggerSetting,
  ExplosiveSettings,
} from '@src/entities/weapon-settings';
import { prettyMilliseconds } from '@src/features/time';
import { localize } from '@src/foundry/localization';
import { joinLabeledFormulas } from '@src/foundry/rolls';
import { formatDamageType } from '@src/health/health';
import { notEmpty } from '@src/utility/helpers';
import { customElement, html, LitElement, property } from 'lit-element';
import { compact, map } from 'remeda';
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

  private settingsWindow?: SlWindow | null = null;

  updated() {
    const popout = this.settingsWindow?.querySelector<ExplosiveSettingsForm>(
      ExplosiveSettingsForm.is,
    );
    if (popout) popout.explosive = this.explosive;
  }

  disconnected() {
    this.settingsWindow = null;
  }

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
    return html`
      <div class="shared">
        ${sticky ? html`<div>${localize('sticky')}</div>` : ''}
        <div class="area-effect">
          ${localize('areaEffect')}
          <span class="area-values"> ${formatAreaEffect(this.explosive)} </span>
        </div>
      </div>
      <ul class="attacks">
        ${this.renderAttack(attacks.primary)}
        ${attacks.secondary ? this.renderAttack(attacks.secondary) : ''}
      </ul>

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
    const info = compact([
      notEmpty(attack.rollFormulas) &&
        [
          formatDamageType(attack.damageType),
          joinLabeledFormulas(attack.rollFormulas),
          formatArmorUsed(attack),
        ].join(' '),
      notEmpty(attack.attackTraits) &&
        map(attack.attackTraits, localize).join(', '),
      attack.duration &&
        `${localize('lasts')} ${prettyMilliseconds(attack.duration)}`,
      attack.notes,
    ]).join('. ');
    if (!this.explosive.hasSecondaryMode && !info) return '';
    return html`
      <li>
        ${this.explosive.hasSecondaryMode
          ? html` <span class="label">${attack.label}</span> `
          : ''}
        <span> ${info.endsWith('.') ? info : `${info}.`}</span>
      </li>
    `;
  }

  private openExplosivePlacingWindow() {
    const initialSettings = { placing: true };
    this.settingsWindow = ExplosiveSettingsForm.openWindow({
      explosive: this.explosive,
      requireSubmit: true,
      update: this.createMessage.bind(this),
      initialSettings,
    }).win;
  }

  private openExplosiveSettingsDialog() {
    this.settingsWindow = ExplosiveSettingsForm.openWindow({
      explosive: this.explosive,
      requireSubmit: true,
      update: this.createMessage.bind(this),
    }).win;
  }
}
declare global {
  interface HTMLElementTagNameMap {
    'character-view-explosive-attacks': CharacterViewExplosiveAttacks;
  }
}
