import { enumValues } from '@src/data-enums';
import type { Character } from '@src/entities/actor/proxies/character';
import { ActorType } from '@src/entities/entity-types';
import { ArmorType } from '@src/features/active-armor';
import { EffectType, formatEffect, Source } from '@src/features/effects';
import { localize } from '@src/foundry/localization';
import { customElement, LitElement, property, html } from 'lit-element';
import styles from './character-view-armor.scss';

@customElement('character-view-armor')
export class CharacterViewArmor extends LitElement {
  static get is() {
    return 'character-view-armor' as const;
  }

  static styles = [styles];

  @property({ attribute: false }) character!: Character;

  private get movementModifiers() {
    if (
      !this.character.sleeve ||
      this.character.sleeve.type === ActorType.Infomorph
    )
      return {};
    return {
      encumbered: this.character.armor.isEncumbered(
        this.character.sleeve.physicalHealth.main.durability.value,
      ),
      overburdened: this.character.armor.isOverburdened,
    };
  }

  render() {
    const { encumbered, overburdened } = this.movementModifiers;
    const { armor, disabled } = this.character;
    // TODO manually add and remove armor reduction
    return html`
      <character-view-drawer-heading
        >${localize('armor')}</character-view-drawer-heading
      >

      <div class="movement-modifiers">
      ${overburdened
        ? html`
            <sl-group label=${localize('overburdened')}
              >// TODO: Movement is reduced by half</sl-group
            >
          `
        : ''}
      ${encumbered
        ? html`
            <sl-group label=${localize('encumbered')}
              >// TODO: Cannot Move</sl-group
            >
          `
        : ''}
      </div>

      <sl-header
      heading=${localize('sources')}
      itemCount=${armor.sources.length}
        >
        <sl-group slot="action" label=${localize('layers')}
          >${armor.get('layers')}</sl-group
        >
      </sl-header>
      <ul>
        ${armor.sources.map(
          (effect) => html`
            <li>[${effect[Source]}] ${formatEffect(effect)}</li>
          `,
        )}
      </ul>

      <sl-header heading=${localize('armorReduction')}></sl-header>
      <sl-animated-list>
        ${this.character.sleeve?.epData.damagedArmor.map(
          ({ source, id, ...armors }) => html`
            <wl-list-item
              clickable
              ?disabled=${this.character.disabled}
              @click=${() => this.character.sleeve?.removeArmorDamage(id)}
            >
              <span slot="before">${source}</span>
              <span
                >${enumValues(ArmorType).map((type, index, list) => {
                  const reduction = armors[type];
                  return reduction
                    ? `${localize(type)}: ${-reduction}${
                        index < list.length - 1 ? ', ' : ''
                      }`
                    : '';
                })}</span
              >
            </wl-list-item>
          `,
        )}
      </sl-animated-list>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'character-view-armor': CharacterViewArmor;
  }
}
