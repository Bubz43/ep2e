import { createMessage } from '@src/chat/create-message';
import type { DamageMessageData } from '@src/chat/message-data';
import { formatArmorUsed } from '@src/combat/attack-formatting';
import { startMeleeAttack } from '@src/combat/attack-init';
import type { AttackType, MeleeWeaponAttack } from '@src/combat/attacks';
import { ActorType } from '@src/entities/entity-types';
import type { MeleeWeapon } from '@src/entities/item/proxies/melee-weapon';
import { localize } from '@src/foundry/localization';
import { joinLabeledFormulas, rollLabeledFormulas } from '@src/foundry/rolls';
import { formatDamageType } from '@src/health/health';
import { notEmpty, withSign } from '@src/utility/helpers';
import { customElement, html, LitElement, property } from 'lit-element';
import { compact, map, pick, pipe } from 'remeda';
import { stopEvent } from 'weightless';
import { requestCharacter } from '../../character-request-event';
import styles from './attack-info-styles.scss';
import { openCoatingMenu, openMeleePayloadMenu } from './melee-weapon-menus';

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
    const { attacks, name, hasSecondaryAttack, augmentUnarmed } = this.weapon;
    const unarmed =
      character?.sleeve && character.sleeve.type !== ActorType.Infomorph
        ? character.sleeve.unarmedDV
        : null;
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
      rolledFormulas: pipe(
        [
          augmentUnarmed && {
            label: localize('unarmedDV'),
            formula: unarmed || '0',
          },
          ...(character?.appliedEffects.meleeDamageBonuses || []),
          ...attack.rollFormulas,
        ],
        compact,
        rollLabeledFormulas,
      ),
    };
    createMessage({
      data: {
        header: this.weapon.messageHeader,
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
