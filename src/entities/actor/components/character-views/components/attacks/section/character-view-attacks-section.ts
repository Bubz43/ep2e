import { createMessage } from '@src/chat/create-message';
import { startThrownAttack } from '@src/combat/attack-init';
import { meleeDamage } from '@src/combat/melee-damage';
import { LazyRipple } from '@src/components/mixins/lazy-ripple';
import type { MaybeToken } from '@src/entities/actor/actor';
import type { Character } from '@src/entities/actor/proxies/character';
import type { Infomorph } from '@src/entities/actor/proxies/infomorph';
import type { Sleeve } from '@src/entities/actor/sleeves';
import { ActorType } from '@src/entities/entity-types';
import type { ItemProxy } from '@src/entities/item/item';
import { renderItemCard } from '@src/entities/item/item-views';
import {
  getCurrentEnvironment,
  subscribeToEnvironmentChange,
} from '@src/features/environment';
import { idProp } from '@src/features/feature-helpers';
import { SkillType } from '@src/features/skills';
import { localize } from '@src/foundry/localization';
import { openMenu } from '@src/open-menu';
import { MeleeAttackControls } from '@src/success-test/components/melee-attack-controls/melee-attack-controls';
import { applyGravityToWeaponRange } from '@src/success-test/range-modifiers';
import { SuccessTestResult } from '@src/success-test/success-test';
import { customElement, html, LitElement, property } from 'lit-element';
import { repeat } from 'lit-html/directives/repeat';
import { identity } from 'remeda';
import { renderItemAttacks } from '../render-item-attacks';
import styles from './character-view-attacks-section.scss';

const groups = ['melee', 'software', 'thrown', 'ranged'] as const;

type WeaponGroup = typeof groups[number];

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
    melee: true,
    thrown: true,
    software: true,
    ranged: true,
  };

  private environmentUnsub: (() => void) | null = null;

  connectedCallback() {
    super.connectedCallback();
    this.environmentUnsub = subscribeToEnvironmentChange(() =>
      this.requestUpdate(),
    );
  }

  disconnectedCallback() {
    this.environmentUnsub?.();
    this.environmentUnsub = null;
    super.disconnectedCallback();
  }

  private toggleActive(group: WeaponGroup) {
    this.activeGroups[group] = !this.activeGroups[group];
    this.requestUpdate();
  }

  private rollUnarmedDamage() {
    const { sleeve, morphSize } = this.character;
    const damage =
      !sleeve || sleeve.type === ActorType.Infomorph ? '0' : sleeve.unarmedDV;
    createMessage({
      data: {
        header: { heading: localize('unarmed') },
        damage: meleeDamage({
          source: localize('unarmed'),
          successTestInfo: {
            result: SuccessTestResult.Success,
            superiorEffects: undefined,
          },
          augmentUnarmed: true,
          unarmedDV: damage,
          damageModifiers: this.character?.appliedEffects.meleeDamageBonuses,
          morphSize: morphSize,
          settings: {},
          attack: undefined,
          alwaysArmorPiercing: this.character?.meleeDamageArmorPiercing,
        }),
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
    const adjacentElement = ev.currentTarget as HTMLElement;
    openMenu({
      header: { heading: localize('throw') },
      position: ev,
      content: this.character.weapons.thrown.map((weapon) => ({
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
    // TODO Full defense, aim
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

      <sl-animated-list class="attacks">
        ${repeat(
          groups.filter((g) => weapons[g].length && this.activeGroups[g]),
          identity,
          (key) => {
            const group = weapons[key] as ItemProxy[];
            return repeat(group, idProp, (weapon) =>
              renderItemCard(weapon, {
                unexpandedContent: renderItemAttacks(weapon),
                character: this.character,
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
          ?disabled=${this.character.disabled ||
          this.character.weapons.thrown.length === 0}
          @click=${this.selectThrowingWeapon}
          >${localize('throwingRange')}
          <span slot="after"
            >${applyGravityToWeaponRange(
              this.character.ego.aptitudes.som,
              getCurrentEnvironment().gravity,
            )}</span
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
