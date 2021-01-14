import {
  renderTextField,
  renderNumberField,
} from '@src/components/field/fields';
import { renderSubmitForm } from '@src/components/form/forms';
import {
  Source,
  SourcedEffect,
  SuccessTestEffect,
} from '@src/features/effects';
import { localize } from '@src/foundry/localization';
import { createSuccessTestModifier, SuccessTestModifier } from '@src/success-test/success-test';
import { withSign } from '@src/utility/helpers';
import { customElement, LitElement, property, html } from 'lit-element';
import { classMap } from 'lit-html/directives/class-map';
import { repeat } from 'lit-html/directives/repeat';
import { first, identity } from 'remeda';
import styles from './success-test-modifiers-section.scss';

@customElement('success-test-modifiers-section')
export class SuccessTestModifiersSection extends LitElement {
  static get is() {
    return 'success-test-modifiers-section' as const;
  }

  static get styles() {
    return [styles];
  }

  @property({ type: Boolean, reflect: true }) ignored = false;

  @property({ type: Number }) total = 0;

  @property({ attribute: false }) modifierStore!: {
    effects: Map<SourcedEffect<SuccessTestEffect>, boolean>;
    toggleEffect: (effect: SuccessTestEffect) => void;
    modifiers: Set<SuccessTestModifier>;
    toggleModifier: (modifier: SuccessTestModifier) => void;
  };

  render() {
    return html`
      <sl-header
        itemCount=${withSign(this.total)}
        heading=${localize('modifiers')}
      >
        <sl-popover
          focusSelector="input[type='number']"
          slot="action"
          .renderOnDemand=${() => html` <sl-popover-section
            heading="${localize('add')} ${localize('modifier')}"
          >
            ${renderSubmitForm({
              submitEmpty: true,
              props: {
                name: localize('situational'),
                value: 10,
                temporary: true,
              },
              update: (changed, orig) =>
                this.modifierStore.toggleModifier(
                  createSuccessTestModifier({ ...orig, ...changed }),
                ),
              fields: ({ name, value }) => [
                renderTextField(name, { required: true }),
                renderNumberField(value, {
                  min: -95,
                  max: 95,
                  required: true,
                }),
              ],
            })}
          </sl-popover-section>`}
        >
          <mwc-icon-button slot="base" icon="add"></mwc-icon-button>
        </sl-popover>
      </sl-header>
      <sl-animated-list transformOrigin="top">
        ${repeat(this.modifierStore.effects, first(), ([effect, active]) => {
          const useWhen =
            effect.requirement && `${localize('when')} ${effect.requirement}`;
          return html`
            <wl-list-item
              class=${classMap({ tall: !!useWhen })}
              ?clickable=${!!useWhen}
              @click=${() => {
                useWhen && this.modifierStore.toggleEffect(effect);
              }}
            >
              <span
                slot="before"
                class=${classMap({
                  tall: !!useWhen,
                  active: !useWhen || active,
                  negative: effect.modifier < 0,
                })}
              ></span>
              <span class="source" title=${effect[Source]}
                >${effect[Source]}</span
              >
              <span slot="after">${withSign(effect.modifier)}</span>
              ${useWhen
                ? html`
                    <span class="requirement" title=${useWhen}>${useWhen}</span>
                  `
                : ''}
            </wl-list-item>
          `;
        })}
        ${repeat(
          this.modifierStore.modifiers,
          identity,
          (modifier) => html`
            <wl-list-item
              ?clickable=${!!modifier.temporary}
              @click=${() =>
                modifier.temporary &&
                this.modifierStore.toggleModifier(modifier)}
            >
              ${modifier.temporary
                ? html` <mwc-icon slot="before">close</mwc-icon> `
                : modifier.icon
                ? html`<img src=${modifier.icon} slot="before" />`
                : html` <span slot="before"></span> `}
              <span class="source">${modifier.name}</span>
              <span slot="after">${withSign(modifier.value)}</span>
            </wl-list-item>
          `,
        )}
      </sl-animated-list>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'success-test-modifiers-section': SuccessTestModifiersSection;
  }
}
