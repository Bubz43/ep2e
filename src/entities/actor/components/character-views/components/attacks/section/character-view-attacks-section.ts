import { LazyRipple } from '@src/components/mixins/lazy-ripple';
import type { MaybeToken } from '@src/entities/actor/actor';
import type { Character } from '@src/entities/actor/proxies/character';
import { ActorType } from '@src/entities/entity-types';
import { idProp } from '@src/features/feature-helpers';
import { FieldSkillType, SkillType } from '@src/features/skills';
import { localize } from '@src/foundry/localization';
import { MeleeAttackControls } from '@src/success-test/components/melee-attack-controls/melee-attack-controls';
import { clickIfEnter } from '@src/utility/helpers';
import { customElement, LitElement, property, html } from 'lit-element';
import { classMap } from 'lit-html/directives/class-map';
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

  @property({ type: Boolean, reflect: true }) collapsed = false;

  private toggleCollapse() {
    this.collapsed = !this.collapsed;
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
    const { sleeve } = this.character;
    return html`
      <sl-header
        part="header"
        hideBorder
        heading=${localize('attacks')}
        @click=${this.toggleCollapse}
        @focus="${this.handleRippleFocus}"
        @blur="${this.handleRippleBlur}"
        @mousedown="${this.handleRippleMouseDown}"
        @mouseenter="${this.handleRippleMouseEnter}"
        @mouseleave="${this.handleRippleMouseLeave}"
        @keydown=${clickIfEnter}
        tabindex="0"
      >
        <span slot="action">${this.renderRipple()}</span>
        <mwc-icon
          slot="action"
          class="toggle-icon ${classMap({ collapsed: this.collapsed })}"
        >
          keyboard_arrow_down
        </mwc-icon>
      </sl-header>
      <sl-animated-list class="attacks" ?hidden=${this.collapsed}>
        ${sleeve && sleeve.type !== ActorType.Infomorph
          ? html`
              <wl-list-item clickable @click=${this.startUnarmedAttack}
                >${localize('unarmedDV')} ${sleeve.unarmedDV}</wl-list-item
              >
            `
          : ''}
        ${repeat(
          this.character.weapons.melee,
          idProp,
          (weapon) => html`
            <li>
              <header>
                ${weapon.name} <span class="type">${weapon.fullType}</span>
              </header>
              <character-view-melee-weapon-attacks
                .weapon=${weapon}
              ></character-view-melee-weapon-attacks>
            </li>
          `,
        )}
        ${repeat(
          this.character.weapons.explosives,
          idProp,
          (explosive) => html`
            <li>
              <header>
                ${explosive.fullName}
                <span class="type">${explosive.fullType}</span>
              </header>
              <character-view-explosive-attacks
                .explosive=${explosive}
              ></character-view-explosive-attacks>
            </li>
          `,
        )}
      </sl-animated-list>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'character-view-attacks-section': CharacterViewAttacksSection;
  }
}
