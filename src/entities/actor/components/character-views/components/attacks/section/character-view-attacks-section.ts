import { createMessage } from '@src/chat/create-message';
import { startThrownAttack } from '@src/combat/attack-init';
import { LazyRipple } from '@src/components/mixins/lazy-ripple';
import type { MaybeToken } from '@src/entities/actor/actor';
import type { Character } from '@src/entities/actor/proxies/character';
import type { Infomorph } from '@src/entities/actor/proxies/infomorph';
import type { Sleeve } from '@src/entities/actor/sleeves';
import { ActorType } from '@src/entities/entity-types';
import type { ItemProxy } from '@src/entities/item/item';
import { renderItemCard } from '@src/entities/item/item-views';
import { ArmorType } from '@src/features/active-armor';
import { idProp } from '@src/features/feature-helpers';
import { SkillType } from '@src/features/skills';
import { localize } from '@src/foundry/localization';
import { rollLabeledFormulas } from '@src/foundry/rolls';
import { HealthType } from '@src/health/health';
import { openMenu } from '@src/open-menu';
import { MeleeAttackControls } from '@src/success-test/components/melee-attack-controls/melee-attack-controls';
import { customElement, html, LitElement, property } from 'lit-element';
import { repeat } from 'lit-html/directives/repeat';
import { identity } from 'remeda';
import type { FixedLengthArray } from 'type-fest';
import { renderItemAttacks } from '../render-item-attacks';
import styles from './character-view-attacks-section.scss';

type WeaponGroup = keyof Character['weapons'];

const groups: FixedLengthArray<WeaponGroup, 5> = [
  'explosives',
  'melee',
  'software',
  'thrown',
  'ranged',
];

/**
 * @csspart header
 */
@customElement('character-view-attacks-section')
export class CharacterViewAttacksSection extends LazyRipple(LitElement) {
  static get is() {
    return 'character-view-attacks-section' as const;
  }

  static get styles() {
    return [styles];
  }

  @property({ attribute: false }) character!: Character;

  @property({ attribute: false }) token?: MaybeToken;

  private activeGroups: Record<WeaponGroup, boolean> = {
    explosives: true,
    melee: true,
    software: true,
    thrown: true,
    ranged: true,
  };

  private toggleActive(group: WeaponGroup) {
    this.activeGroups[group] = !this.activeGroups[group];
    this.requestUpdate();
  }

  private rollUnarmedDamage() {
    const { sleeve } = this.character;
    const damage =
      !sleeve || sleeve.type === ActorType.Infomorph ? '0' : sleeve.unarmedDV;
    createMessage({
      data: {
        header: { heading: localize('unarmed') },
        damage: {
          source: localize('unarmed'),
          armorUsed: [ArmorType.Kinetic],
          damageType: HealthType.Physical,
          rolledFormulas: rollLabeledFormulas([
            ...this.character.appliedEffects.meleeDamageBonuses,
            { label: localize('unarmed'), formula: damage },
          ]),
        },
      },
      entity: this.token ?? this.character,
    });
  }

  private startUnarmedAttack() {
    MeleeAttackControls.openWindow({
      entities: { token: this.token, actor: this.character.actor },
      getState: (actor) => {
        if (actor.proxy.type === ActorType.Character) {
          const { ego } = actor.proxy;
          return {
            ego,
            character: actor.proxy,
            token: this.token,
            skill: ego.getCommonSkill(SkillType.Melee),
          };
        }
        return null;
      },
    });
  }

  private selectThrowingWeapon(ev: MouseEvent) {
    const { explosives, thrown } = this.character.weapons;
    const throwable = [...thrown, ...explosives.filter((e) => e.isGrenade)];
    const adjacentElement = ev.currentTarget as HTMLElement;
    openMenu({
      header: { heading: localize('throw') },
      position: ev,
      content: throwable.map((weapon) => ({
        label: weapon.fullName,
        sublabel: weapon.fullType,
        disabled: !weapon.quantity,
        callback: () =>
          startThrownAttack({
            token: this.token,
            actor: this.character.actor,
            weaponId: weapon.id,
            adjacentElement,
          }),
      })),
    });
  }

  render() {
    const { sleeve, weapons } = this.character;
    return html`
      <div class="group-toggles">
        ${groups.map((key) => {
          const group = weapons[key];
          if (group.length === 0) return '';
          const active = this.activeGroups[key];
          return html`
            <mwc-button
              dense
              ?outlined=${!active}
              ?unelevated=${active}
              @click=${() => this.toggleActive(key)}
              label=${localize(key)}
            ></mwc-button>
          `;
        })}
      </div>
      ${sleeve && sleeve.type !== ActorType.Infomorph
        ? this.renderPhysicalSleeveInfo(sleeve)
        : ''}

      <sl-animated-list class="attacks" transformOrigin="top">
        ${repeat(
          groups.filter((g) => weapons[g].length && this.activeGroups[g]),
          identity,
          (key) => {
            const group = weapons[key] as ItemProxy[];
            return repeat(group, idProp, (weapon) =>
              renderItemCard(weapon, {
                unexpandedContent: renderItemAttacks(weapon),
              }),
            );
          },
        )}
      </sl-animated-list>
    `;
  }

  private renderPhysicalSleeveInfo(sleeve: Exclude<Sleeve, Infomorph>) {
    return html`
      <div class="physical-info">
        <colored-tag
          clickable
          type="attack"
          @click=${this.startUnarmedAttack}
          @contextmenu=${this.rollUnarmedDamage}
          ?disabled=${this.character.disabled}
          >${localize('unarmedDV')}
          <span slot="after">${sleeve.unarmedDV}</span></colored-tag
        >
        <colored-tag
          type="attack"
          clickable
          ?disabled=${this.character.disabled}
          @click=${this.selectThrowingWeapon}
          >${localize('throwingRange')}
          <span slot="after"
            >${this.character.ego.aptitudes.som}</span
          ></colored-tag
        >
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'character-view-attacks-section': CharacterViewAttacksSection;
  }
}
