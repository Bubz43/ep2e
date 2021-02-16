import { createMessage } from '@src/chat/create-message';
import type { DamageMessageData } from '@src/chat/message-data';
import type { AttackType } from '@src/combat/attacks';
import { LazyRipple } from '@src/components/mixins/lazy-ripple';
import { ActorType } from '@src/entities/entity-types';
import type { Software } from '@src/entities/item/proxies/software';
import { SkillType } from '@src/features/skills';
import { localize } from '@src/foundry/localization';
import { rollLabeledFormulas } from '@src/foundry/rolls';
import { HackingTestControls } from '@src/success-test/components/hacking-test-controls/hacking-test-controls';
import { isButton } from '@src/utility/dom';
import {
  customElement,
  html,
  internalProperty,
  LitElement,
  property,
  query,
} from 'lit-element';
import mix from 'mix-with/lib';
import { compact, pick, pipe } from 'remeda';
import { requestCharacter } from '../../../character-request-event';
import styles from './character-view-software-attacks.scss';

@customElement('character-view-software-attacks')
export class CharacterViewSoftwareAttacks extends mix(LitElement).with(
  LazyRipple,
) {
  static get is() {
    return 'character-view-software-attacks' as const;
  }

  static get styles() {
    return [styles];
  }

  @property({ attribute: false }) software!: Software;

  @internalProperty() expanded = false;

  @query('.card') private card!: HTMLElement;

  private toggleExpanded() {
    this.expanded = !this.expanded;
  }

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
        hack: {
          software: this.software.getDataCopy(),
          attackType,
        },
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
  private startDefaultAttack(ev: Event) {
    const first = ev?.composedPath().find(isButton);
    if (first === this.card) this.startAttackTest('primary');
  }

  protected handleRippleMouseDown(ev?: Event) {
    const first = ev?.composedPath().find(isButton);
    if (first !== this.card) return;
    super.handleRippleMouseDown(ev);
  }

  render() {
    const { primary, secondary } = this.software.attacks;

    return html`
      <div
        class="card"
        @click=${this.startDefaultAttack}
        @focus="${this.handleRippleFocus}"
        @blur="${this.handleRippleBlur}"
        @mousedown="${this.handleRippleMouseDown}"
        @mouseenter="${this.handleRippleMouseEnter}"
        @mouseleave="${this.handleRippleMouseLeave}"
        role="button"
      >
        <span class="name"
          >${this.software.name}
          <span class="type">${this.software.fullType}</span></span
        >
        ${secondary
          ? html`
              <div class="attacks">
                <mwc-button
                  dense
                  @click=${() => this.startAttackTest('primary')}
                  @contextmenu=${() => this.createMessage('primary')}
                  >${secondary ? primary.label : localize('attack')}</mwc-button
                >
                <mwc-button
                  @click=${() => this.startAttackTest('secondary')}
                  @contextmenu=${() => this.createMessage('secondary')}
                  dense
                  >${secondary.label}</mwc-button
                >
              </div>
            `
          : ''}
        <mwc-icon-button
          slot="after"
          icon=${this.expanded ? 'keyboard_arrow_up' : 'keyboard_arrow_left'}
          class="toggle"
          @click=${this.toggleExpanded}
        ></mwc-icon-button>
        ${this.renderRipple(!this.software.editable)}
        ${this.expanded
          ? html`<enriched-html
              class="description"
              content=${this.software.description}
            ></enriched-html>`
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
