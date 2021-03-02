import { createMessage } from '@src/chat/create-message';
import type { DamageMessageData } from '@src/chat/message-data';
import { formatArmorUsed } from '@src/combat/attack-formatting';
import { startMeleeAttack } from '@src/combat/attack-init';
import type { AttackType, MeleeWeaponAttack } from '@src/combat/attacks';
import { ActorType, ItemType } from '@src/entities/entity-types';
import type { MeleeWeapon } from '@src/entities/item/proxies/melee-weapon';
import { localize } from '@src/foundry/localization';
import { joinLabeledFormulas, rollLabeledFormulas } from '@src/foundry/rolls';
import { formatDamageType } from '@src/health/health';
import { openMenu } from '@src/open-menu';
import { notEmpty, withSign } from '@src/utility/helpers';
import produce from 'immer';
import { customElement, html, LitElement, property } from 'lit-element';
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
    const coatings =
      character?.consumables.flatMap((c) =>
        c.type === ItemType.Substance && !(c.isBlueprint || c.isElectronic)
          ? c
          : [],
      ) ?? [];
    const { coating } = this.weapon;
    openMenu({
      header: { heading: `${this.weapon.name} ${localize('coating')}` },
      content: [
        ...(coating
          ? compact([
              {
                label: `${localize('remove')} ${coating.name}`,
                callback: async () => {
                  const same = coatings.find((c) => c.isSameAs(coating));
                  if (same) await same.setQuantity((current) => current + 1);
                  else
                    await character?.itemOperations.add(
                      produce(
                        coating.getDataCopy(),
                        ({ data }) => void (data.quantity = 1),
                      ),
                    );
                  await this.weapon.removeCoating();
                },
              },
              coatings.length && 'divider',
            ])
          : []),
        ...coatings.map((c) => ({
          label: c.fullName,
          callback: async () => {
            await this.weapon.setCoating(c);
            c.setQuantity((current) => current - 1);
          },
          activated: this.weapon.coating?.isSameAs(c),
          disabled: !c.quantity,
        })),
      ],
      position: ev,
    });
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
        ? html` <wl-list-item
            clickable
            ?disabled=${!editable}
            class="usable"
            @click=${this.openCoatingSelectMenu}
          >
            <span>${localize('coating')}:</span>
            <span slot="after">${coating.name}</span></wl-list-item
          >`
        : ''}
      ${acceptsPayload
        ? html`
            <wl-list-item class="usable" clickable ?disabled=${!editable}>
              <span>${localize('payload')}:</span>
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
            </wl-list-item>
          `
        : ''}
      ${exoticSkillName
        ? html`<wl-list-item class="info"
            >${localize('exotic')}:
            <span slot="after">${exoticSkillName}</span></wl-list-item
          >`
        : ''}
      ${reachBonus
        ? html`<wl-list-item class="info"
            >${localize('reach')}:
            <span slot="after">${withSign(reachBonus)}</span></wl-list-item
          >`
        : ''}
      ${isTouchOnly
        ? html`<wl-list-item class="info"
            >${localize('touchOnly')}</wl-list-item
          >`
        : ''}
      ${gearTraits.map(
        (trait) =>
          html`<wl-list-item class="info">${localize(trait)}</wl-list-item>`,
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
    if (!this.weapon.hasSecondaryAttack && !info) return '';
    return html`
      <wl-list-item
        clickable
        class="attack"
        @click=${() => this.startAttackTest(type)}
        @contextmenu=${() => this.createMessage(type)}
      >
        <div>
          ${this.weapon.hasSecondaryAttack
            ? html` <span class="label">${attack.label}</span> `
            : ''} <span> ${info}</span>
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
