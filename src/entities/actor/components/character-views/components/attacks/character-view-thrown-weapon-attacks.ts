import { createMessage } from '@src/chat/create-message';
import type { DamageMessageData } from '@src/chat/message-data';
import { formatArmorUsed } from '@src/combat/attack-formatting';
import { startThrownAttack } from '@src/combat/attack-init';
import type { AttackType, MeleeWeaponAttack } from '@src/combat/attacks';
import type { ThrownWeapon } from '@src/entities/item/proxies/thrown-weapon';
import { localize } from '@src/foundry/localization';
import { joinLabeledFormulas, rollLabeledFormulas } from '@src/foundry/rolls';
import { formatDamageType } from '@src/health/health';
import { notEmpty } from '@src/utility/helpers';
import { customElement, html, LitElement, property } from 'lit-element';
import { compact, map, pick, pipe } from 'remeda';
import { stopEvent } from 'weightless';
import { requestCharacter } from '../../character-request-event';
import { openCoatingMenu } from './ammo-menus';
import styles from './attack-info-styles.scss';

@customElement('character-view-thrown-weapon-attacks')
export class CharacterViewThrownWeaponAttacks extends LitElement {
  static get is() {
    return 'character-view-thrown-weapon-attacks' as const;
  }

  static get styles() {
    return [styles];
  }

  @property({ attribute: false }) weapon!: ThrownWeapon;

  private async createMessage() {
    const { token, character } = requestCharacter(this);
    const { attacks, name } = this.weapon;

    const { primary: attack } = attacks;

    const damage: DamageMessageData = {
      ...pick(attack, [
        'armorPiercing',
        'armorUsed',
        'damageType',
        'notes',
        'reduceAVbyDV',
      ]),
      source: name,
      rolledFormulas: await pipe(
        [...attack.rollFormulas],
        compact,
        rollLabeledFormulas,
      ),
    };
    createMessage({
      data: {
        header: this.weapon.messageHeader,
        thrownAttack: { weapon: this.weapon.getDataCopy() },
        damage,
      },
      entity: token || character,
    });
  }

  private openCoatingSelectMenu(ev: MouseEvent) {
    const { character } = requestCharacter(this);
    character && openCoatingMenu(ev, character, this.weapon);
  }

  private startAttack() {
    const { character, token } = requestCharacter(this);

    character &&
      startThrownAttack({
        token: token,
        actor: character.actor,
        weaponId: this.weapon.id,
        adjacentElement: this,
      });
  }

  render() {
    const {
      attacks,
      coating,
      editable,
      gearTraits,
      exoticSkillName,
    } = this.weapon;
    // TODO only clickable if there is available coatings
    return html`
      ${this.renderAttack(attacks.primary, 'primary')}
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
      ${exoticSkillName
        ? html`<colored-tag type="info"
            >${localize('exotic')}:
            <span slot="after">${exoticSkillName}</span></colored-tag
          >`
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
    return html`
      <colored-tag
        type="attack"
        clickable
        ?disabled=${!this.weapon.editable}
        @click=${this.startAttack}
        @contextmenu=${(ev: Event) => {
          stopEvent(ev);
          this.createMessage();
        }}
      >
        <span> ${info}</span>
      </colored-tag>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'character-view-thrown-weapon-attacks': CharacterViewThrownWeaponAttacks;
  }
}
