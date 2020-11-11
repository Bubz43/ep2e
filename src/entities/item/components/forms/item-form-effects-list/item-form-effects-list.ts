import { Placement } from '@src/components/popover/popover-options';
import type { EffectUpdatedEvent } from '@src/features/components/effect-editor/effect-updated-event';
import { Effect, formatEffect } from '@src/features/effects';
import {
  AddUpdateRemoveFeature,
  idProp,
  StringID,
} from '@src/features/feature-helpers';
import { localize } from '@src/foundry/localization';
import { openMenu } from '@src/open-menu';
import { customElement, LitElement, property, html } from 'lit-element';
import { repeat } from 'lit-html/directives/repeat';
import { sortBy } from 'remeda';
import styles from './item-form-effects-list.scss';

@customElement('item-form-effects-list')
export class ItemFormEffectsList extends LitElement {
  static get is() {
    return 'item-form-effects-list' as const;
  }

  static styles = [styles];

  @property({ type: String }) label = '';

  @property({ type: Array }) effects!: StringID<Effect>[];

  @property({ attribute: false }) operations!: AddUpdateRemoveFeature<
    StringID<Effect>
  >;

  @property({ type: Boolean }) disabled = false;

  render() {
    const { effects } = this;
    const commaTarget = effects.length - 1;
    return html`
      <sl-animated-list class="effects-list">
        ${this.label ? html` <li class="label">${this.label}:</li> ` : ''}
        ${repeat(
          sortBy(effects, (effect) => localize(effect.type)),
          idProp,
          (effect, index) => html`
            <li>
              <sl-popover
                placement=${Placement.Bottom}
                .renderOnDemand=${() => html`
                  <sl-popover-section
                    heading="${localize('edit')} ${localize('effect')}"
                  >
                    <delete-button
                      slot="action"
                      @delete=${this.operations.removeCallback(effect.id)}
                    ></delete-button>
                    <effect-editor
                      .effect=${effect}
                      @effect-updated=${(ev: EffectUpdatedEvent) =>
                        this.operations.update(ev.effect, effect)}
                    ></effect-editor>
                  </sl-popover-section>
                `}
              >
                <button
                  slot="base"
                  ?disabled=${this.disabled}
                  ?data-comma=${index < commaTarget}
                >
                  ${formatEffect(effect)}
                </button>
              </sl-popover>
            </li>
          `,
        )}
      </sl-animated-list>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'item-form-effects-list': ItemFormEffectsList;
  }
}
