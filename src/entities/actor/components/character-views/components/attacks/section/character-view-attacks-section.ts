import { createMessage } from '@src/chat/create-message';
import { LazyRipple } from '@src/components/mixins/lazy-ripple';
import type { MaybeToken } from '@src/entities/actor/actor';
import type { Character } from '@src/entities/actor/proxies/character';
import type { Infomorph } from '@src/entities/actor/proxies/infomorph';
import type { Sleeve } from '@src/entities/actor/sleeves';
import { ActorType } from '@src/entities/entity-types';
import { renderItemCard } from '@src/entities/item/item-views';
import { ArmorType } from '@src/features/active-armor';
import { idProp } from '@src/features/feature-helpers';
import { SkillType } from '@src/features/skills';
import { localize } from '@src/foundry/localization';
import { rollLabeledFormulas } from '@src/foundry/rolls';
import { HealthType } from '@src/health/health';
import { MeleeAttackControls } from '@src/success-test/components/melee-attack-controls/melee-attack-controls';
import { customElement, html, LitElement, property } from 'lit-element';
import { repeat } from 'lit-html/directives/repeat';
import styles from './character-view-attacks-section.scss';

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

  render() {
    const { sleeve, weapons } = this.character;
    const { melee, thrown, software, explosives } = weapons;
    return html`
      ${sleeve && sleeve.type !== ActorType.Infomorph
        ? this.renderPhysicalSleeveInfo(sleeve)
        : ''}

      <sl-animated-list class="attacks">
        ${repeat(software, idProp, (weapon) =>
          renderItemCard(weapon, {
            unexpandedContent: html`<character-view-software-attacks
              .software=${weapon}
            ></character-view-software-attacks>`,
          }),
        )}
        ${repeat(melee, idProp, (weapon) =>
          renderItemCard(weapon, {
            unexpandedContent: html`<character-view-melee-weapon-attacks
              .weapon=${weapon}
            ></character-view-melee-weapon-attacks>`,
          }),
        )}
        ${repeat(explosives, idProp, (explosive) =>
          renderItemCard(explosive, {
            unexpandedContent: html` <character-view-explosive-attacks
              .explosive=${explosive}
            ></character-view-explosive-attacks>`,
          }),
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
          >${localize('unarmedDV')}
          <span slot="after">${sleeve.unarmedDV}</span></colored-tag
        >
        <colored-tag type="info"
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
