import { createMessage } from '@src/chat/create-message';
import { formatArmorUsed } from '@src/combat/attack-formatting';
import { startMeleeAttack } from '@src/combat/attack-init';
import type { AttackType, MeleeWeaponAttack } from '@src/combat/attacks';
import { meleeDamage } from '@src/combat/melee-damage';
import { ActorType } from '@src/entities/entity-types';
import type { MeleeWeapon } from '@src/entities/item/proxies/melee-weapon';
import { Size } from '@src/features/size';
import { localize } from '@src/foundry/localization';
import { joinLabeledFormulas } from '@src/foundry/rolls';
import { formatDamageType } from '@src/health/health';
import { SuccessTestResult } from '@src/success-test/success-test';
import { notEmpty, withSign } from '@src/utility/helpers';
import { customElement, html, LitElement, property } from 'lit-element';
import { compact, map } from 'remeda';
import { stopEvent } from 'weightless';
import { requestCharacter } from '../../character-request-event';
import { openCoatingMenu, openMeleePayloadMenu } from './ammo-menus';
import styles from './attack-info-styles.scss';

@customElement('character-view-melee-weapon-attacks')
export class CharacterViewMeleeWeaponAttacks extends LitElement {
  static get is() {
    return 'character-view-melee-weapon-attacks' as const;
  }

  static get styles() {
    return [styles];
  }

  @property({ attribute: false }) weapon!: MeleeWeapon;

  private async createMessage(attackType: AttackType) {
    const { token, character } = requestCharacter(this);
    const {
      attacks,
      name,
      hasSecondaryAttack,
      augmentUnarmed,
      damageIrrespectiveOfSize,
    } = this.weapon;
    const unarmedDV =
      character?.sleeve && character.sleeve.type !== ActorType.Infomorph
        ? character.sleeve.unarmedDV
        : null;
    const attack = attacks[attackType] || attacks.primary;

    const damage = meleeDamage({
      attack,
      successTestInfo: {
        result: SuccessTestResult.Success,
        superiorEffects: undefined,
      },
      augmentUnarmed,
      unarmedDV,
      damageModifiers: character?.appliedEffects.meleeDamageBonuses,
      morphSize:
        character?.sleeve && 'size' in character.sleeve
          ? character.sleeve.size
          : null,
      source: `${name} ${hasSecondaryAttack ? `[${attack.label}]` : ''}`,
      alwaysArmorPiercing: character?.appliedEffects.meleeAlwaysArmorPiercing,
      settings: { attackType, damageIrrespectiveOfSize },
    });

    const header = this.weapon.messageHeader;
    const size = character?.morphSize;
    createMessage({
      data: {
        header: {
          ...header,
          subheadings: compact([
            header.subheadings,
            size && size !== Size.Medium
              ? `${localize(size)} ${localize('size')} ${localize('user')}`
              : '',
          ]).flat(),
        },
        meleeAttack: { weapon: this.weapon.getDataCopy(), attackType },
        damage,
      },
      entity: token || character,
    });
  }

  private startAttackTest(attackType: AttackType) {
    const { token, character } = requestCharacter(this);
    if (!character) return; // TODO maybe throw error
    startMeleeAttack({
      actor: character.actor,
      token,
      attackType,
      weaponId: this.weapon.id,
    });
  }

  private openCoatingSelectMenu(ev: MouseEvent) {
    const { character } = requestCharacter(this);
    character && openCoatingMenu(ev, character, this.weapon);
  }

  private openPayloadSelectMenu(ev: MouseEvent) {
    const { character } = requestCharacter(this);
    character && openMeleePayloadMenu(ev, character, this.weapon);
  }

  render() {
    const {
      attacks,
      coating,
      payload,
      editable,
      acceptsPayload,
      gearTraits,
      isTouchOnly,
      reachBonus,
      exoticSkillName,
    } = this.weapon;
    // TODO only clickable if there is available coatings
    return html`
      ${this.renderAttack(attacks.primary, 'primary')}
      ${attacks.secondary
        ? this.renderAttack(attacks.secondary, 'secondary')
        : ''}
      ${coating
        ? html`
            <colored-tag
              clickable
              ?disabled=${!editable}
              type="usable"
              @click=${this.openCoatingSelectMenu}
              ><span>${localize('coating')}</span>
              <span slot="after">${coating.name}</span></colored-tag
            >
          `
        : ''}
      ${acceptsPayload
        ? html`
            <colored-tag
              type="usable"
              clickable
              ?disabled=${!editable}
              @click=${this.openPayloadSelectMenu}
            >
              <span>${localize('payload')}</span>
              <span slot="after"
                >${payload
                  ? `${payload.name}
                      ${
                        payload.canContainSubstance && payload.substance
                          ? `(${payload.substance.name})`
                          : ''
                      }`
                  : localize('none')}</span
              >
            </colored-tag>
          `
        : ''}
      ${exoticSkillName
        ? html`<colored-tag type="info"
            >${localize('exotic')}:
            <span slot="after">${exoticSkillName}</span></colored-tag
          >`
        : ''}
      ${reachBonus
        ? html`<colored-tag type="info"
            >${localize('reach')}:
            <span slot="after">${withSign(reachBonus)}</span></colored-tag
          >`
        : ''}
      ${isTouchOnly
        ? html`<colored-tag type="info">${localize('touchOnly')}</colored-tag>`
        : ''}
      ${gearTraits.map(
        (trait) =>
          html`<colored-tag type="info">${localize(trait)}</colored-tag>`,
      )}
    `;
  }

  private renderAttack(attack: MeleeWeaponAttack, type: AttackType) {
    const info = compact([
      notEmpty(attack.rollFormulas) &&
        [
          formatDamageType(attack.damageType),
          joinLabeledFormulas(attack.rollFormulas),
          formatArmorUsed(attack),
        ].join(' '),
      notEmpty(attack.attackTraits) &&
        map(attack.attackTraits, localize).join(', '),
      attack.notes,
    ]).join('. ');
    if (!this.weapon.hasSecondaryAttack && !info.length) return '';
    return html`
      <colored-tag
        type="attack"
        clickable
        ?disabled=${!this.weapon.editable}
        @click=${() => this.startAttackTest(type)}
        @contextmenu=${(ev: Event) => {
          stopEvent(ev);
          this.createMessage(type);
        }}
      >
        <span> ${info}</span>
        ${this.weapon.hasSecondaryAttack
          ? html` <span slot="after">${attack.label}</span> `
          : ''}
      </colored-tag>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'character-view-melee-weapon-attacks': CharacterViewMeleeWeaponAttacks;
  }
}
