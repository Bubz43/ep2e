import { createMessage } from '@src/chat/create-message';
import type { DamageMessageData } from '@src/chat/message-data';
import type { AttackType } from '@src/combat/attacks';
import { ActorType } from '@src/entities/entity-types';
import type { Software } from '@src/entities/item/proxies/software';
import { SkillType } from '@src/features/skills';
import { localize } from '@src/foundry/localization';
import { rollLabeledFormulas } from '@src/foundry/rolls';
import { HackingTestControls } from '@src/success-test/components/hacking-test-controls/hacking-test-controls';
import { customElement, html, LitElement, property } from 'lit-element';
import { compact, pick, pipe } from 'remeda';
import { requestCharacter } from '../../../character-request-event';
import styles from './character-view-software-attacks.scss';

@customElement('character-view-software-attacks')
export class CharacterViewSoftwareAttacks extends LitElement {
  static get is() {
    return 'character-view-software-attacks' as const;
  }

  static get styles() {
    return [styles];
  }

  @property({ attribute: false }) software!: Software;

  private async createMessage(attackType: AttackType) {
    const { token, character } = requestCharacter(this);
    const { attacks, name } = this.software;
    const hasSecondaryAttack = !!attacks.secondary;

    const attack = attacks[attackType] || attacks.primary;

    const damage: DamageMessageData = {
      ...pick(attack, [
        'armorPiercing',
        'armorUsed',
        'damageType',
        'notes',
        'reduceAVbyDV',
      ]),
      source: `${name} ${hasSecondaryAttack ? `[${attack.label}]` : ''}`,
      rolledFormulas: pipe(attack.rollFormulas, compact, rollLabeledFormulas),
    };
    createMessage({
      data: {
        header: this.software.messageHeader,
        // hack
        damage,
      },
      entity: token || character,
    });
  }

  private startAttackTest(attackType: AttackType) {
    const { token, character } = requestCharacter(this);
    if (!character) return; // TODO maybe throw error
    const { software } = this;
    HackingTestControls.openWindow({
      entities: { token, actor: character.actor },
      getState: (actor) => {
        if (actor.proxy.type === ActorType.Character) {
          const { ego, weapons } = actor.proxy;
          const weapon = weapons.software.find((w) => w.id === software.id);
          return {
            ego,
            character: actor.proxy,
            token,
            skill: ego.getCommonSkill(SkillType.Infosec),
            software: weapon,
            primaryAttack: attackType === 'primary',
          };
        }
        return null;
      },
    });
  }

  render() {
    const { primary, secondary } = this.software.attacks;

    return html`
      <span class="name"
        >${this.software.name}
        <span class="type">${this.software.fullType}</span></span
      >
      <div class="attacks">
        <mwc-button
          dense
          @click=${() => this.startAttackTest('primary')}
          @contextmenu=${() => this.createMessage('primary')}
          >${secondary ? primary.label : localize('attack')}</mwc-button
        >
        ${secondary
          ? html`<mwc-button
              @click=${() => this.startAttackTest('secondary')}
              @contextmenu=${() => this.createMessage('secondary')}
              dense
              >${secondary.label}</mwc-button
            >`
          : ''}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'character-view-software-attacks': CharacterViewSoftwareAttacks;
  }
}
