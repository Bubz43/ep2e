import { createMessage } from '@src/chat/create-message';
import type { DamageMessageData } from '@src/chat/message-data';
import { formatArmorUsed } from '@src/combat/attack-formatting';
import type { AttackType, MeleeWeaponAttack } from '@src/combat/attacks';
import { ActorType } from '@src/entities/entity-types';
import type { MeleeWeapon } from '@src/entities/item/proxies/melee-weapon';
import { FieldSkillType, SkillType } from '@src/features/skills';
import { localize } from '@src/foundry/localization';
import { joinLabeledFormulas, rollLabeledFormulas } from '@src/foundry/rolls';
import { formatDamageType } from '@src/health/health';
import { MeleeAttackControls } from '@src/success-test/components/melee-attack-controls/melee-attack-controls';
import { notEmpty } from '@src/utility/helpers';
import { customElement, LitElement, property, html } from 'lit-element';
import { compact, map, pick, pipe } from 'remeda';
import { requestCharacter } from '../../../character-request-event';
import styles from './character-view-melee-weapon-attacks.scss';

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
    const { weapon: meleeWeapon } = this;
    MeleeAttackControls.openWindow({
      entities: { token, actor: character.actor },
      getState: (actor) => {
        if (actor.proxy.type === ActorType.Character) {
          const { ego, weapons } = actor.proxy;
          const weapon = weapons.melee.find((w) => w.id === meleeWeapon.id);
          return {
            ego,
            character: actor.proxy,
            token,
            skill:
              (weapon?.exoticSkillName &&
                ego.findFieldSkill({
                  fieldSkill: FieldSkillType.Exotic,
                  field: weapon.exoticSkillName,
                })) ||
              ego.getCommonSkill(SkillType.Melee),
            meleeWeapon: weapon,
            primaryAttack: attackType === 'primary',
          };
        }
        return null;
      },
    });
  }

  render() {
    const { attacks, coating, payload } = this.weapon;
    return html`
      <div class="shared">
        ${coating
          ? html`<sl-group label=${localize('coating')}
              >${coating.name}</sl-group
            >`
          : ''}
        ${payload
          ? html`<sl-group label=${localize('payload')}
              >${payload.name}
              ${payload.canContainSubstance && payload.substance
                ? `(${payload.substance.name})`
                : ''}</sl-group
            >`
          : ''}
      </div>
      <ul class="attacks">
        ${this.renderAttack(attacks.primary, 'primary')}
        ${attacks.secondary
          ? this.renderAttack(attacks.secondary, 'secondary')
          : ''}
      </ul>
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
      this.weapon.isTouchOnly && localize('touchOnly'),
      attack.notes,
    ]).join('. ');
    if (!this.weapon.hasSecondaryAttack && !info) return '';
    return html`
      <wl-list-item
        clickable
        @click=${() => this.startAttackTest(type)}
        @contextmenu=${() => this.createMessage(type)}
      >
        <div>
          ${this.weapon.hasSecondaryAttack
            ? html` <span class="label">${attack.label}</span> `
            : ''} <span> ${info.endsWith('.') ? info : `${info}.`}</span>
        </div>
      </wl-list-item>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'character-view-melee-weapon-attacks': CharacterViewMeleeWeaponAttacks;
  }
}
