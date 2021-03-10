import { createMessage } from '@src/chat/create-message';
import {
  formatAreaEffect,
  formatArmorUsed,
} from '@src/combat/attack-formatting';
import { startThrownAttack } from '@src/combat/attack-init';
import type { AttackType } from '@src/combat/attacks';
import type { SlWindow } from '@src/components/window/window';
import { ExplosiveTrigger } from '@src/data-enums';
import { Explosive } from '@src/entities/item/proxies/explosive';
import {
  createExplosiveTriggerSetting,
  ExplosiveSettings,
} from '@src/entities/weapon-settings';
import { prettyMilliseconds } from '@src/features/time';
import { localize } from '@src/foundry/localization';
import { joinLabeledFormulas } from '@src/foundry/rolls';
import { formatDamageType } from '@src/health/health';
import { openMenu } from '@src/open-menu';
import { notEmpty } from '@src/utility/helpers';
import { customElement, html, LitElement, property } from 'lit-element';
import { compact, map } from 'remeda';
import { requestCharacter } from '../../character-request-event';
import styles from './attack-info-styles.scss';
import { ExplosiveSettingsForm } from './explosive-settings/explosive-settings-form';

@customElement('character-view-explosive-attacks')
export class CharacterViewExplosiveAttacks extends LitElement {
  static get is() {
    return 'character-view-explosive-attacks' as const;
  }

  static get styles() {
    return [styles];
  }

  @property({ attribute: false }) explosive!: Explosive;

  @property({ attribute: false }) onAttack?: (attackType: AttackType) => void;

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

  private openUseMenu(ev: MouseEvent, attackType: AttackType) {
    const { character, token } = requestCharacter(this);
    const attack = this.explosive.attacks[attackType];
    if (!character || !attack) return;
    const adjacentElement = ev.currentTarget as HTMLElement;
    openMenu({
      position: ev,
      header: {
        heading: `${localize('use')} ${this.explosive.name} ${attack.label}`,
      },
      content: compact([
        {
          label: localize('place'),
          callback: () => this.openExplosivePlacingWindow(attackType),
        },
        this.explosive.isGrenade && {
          label: localize('throw'),
          callback: () =>
            startThrownAttack({
              actor: character.actor,
              token,
              weaponId: this.explosive.id,
              attackType,
              adjacentElement,
            }),
        },
      ]),
    });
  }

  render() {
    const { attacks, sticky } = this.explosive;
    return html`
      ${this.renderAttack('primary')}
      ${attacks.secondary ? this.renderAttack('secondary') : ''}
      ${sticky
        ? html`<colored-tag type="info">${localize('sticky')}</colored-tag>`
        : ''}
      <colored-tag class="area-effect">
        ${localize('areaEffect')}
        <span slot="after"> ${formatAreaEffect(this.explosive)} </span>
      </colored-tag>
    `;
  }

  private renderAttack(attackType: AttackType) {
    const attack = this.explosive.attacks[attackType];
    if (!attack) return '';
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
    if (!this.explosive.hasSecondaryMode && !info.length) return '';
    return html`
      <colored-tag
        type="attack"
        clickable
        ?disabled=${!this.explosive.editable}
        @click=${(ev: MouseEvent) =>
          this.onAttack?.(attackType) || this.openUseMenu(ev, attackType)}
      >
        <span>${info}</span>
        ${this.explosive.hasSecondaryMode
          ? html` <span slot="after">${attack.label}</span> `
          : ''}
      </colored-tag>
    `;
  }

  private openExplosivePlacingWindow(attackType: AttackType) {
    const initialSettings = { placing: true, attackType };
    this.settingsWindow = ExplosiveSettingsForm.openWindow({
      explosive: this.explosive,
      requireSubmit: true,
      update: this.createMessage.bind(this),
      adjacentEl: this,
      initialSettings,
    }).win;
  }
}
declare global {
  interface HTMLElementTagNameMap {
    'character-view-explosive-attacks': CharacterViewExplosiveAttacks;
  }
}
