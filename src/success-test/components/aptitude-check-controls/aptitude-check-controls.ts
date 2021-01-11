import {
  renderLabeledCheckbox,
  renderNumberField,
  renderSelectField,
  renderTextField,
} from '@src/components/field/fields';
import { renderAutoForm, renderSubmitForm } from '@src/components/form/forms';
import { AptitudeType, enumValues } from '@src/data-enums';
import { ActionSubtype, ActionType } from '@src/features/actions';
import { Source } from '@src/features/effects';
import { PreTestPoolAction } from '@src/features/pool';
import { localize } from '@src/foundry/localization';
import type { AptitudeCheck } from '@src/success-test/aptitude-check';
import { notEmpty, withSign } from '@src/utility/helpers';
import {
  customElement,
  html,
  LitElement,
  property,
  PropertyValues,
} from 'lit-element';
import { classMap } from 'lit-html/directives/class-map';
import { repeat } from 'lit-html/directives/repeat';
import { equals, identity } from 'remeda';
import styles from './aptitude-check-controls.scss';

@customElement('aptitude-check-controls')
export class AptitudeCheckControls extends LitElement {
  static get is() {
    return 'aptitude-check-controls' as const;
  }

  static get styles() {
    return [styles];
  }

  @property({ attribute: false }) test!: AptitudeCheck;

  private testUnsub: (() => void) | null = null;

  disconnectedCallback() {
    this.unsub();
    super.disconnectedCallback();
  }

  updated(changedProps: PropertyValues) {
    if (changedProps.has('test')) {
      this.unsub();
      this.testUnsub = this.test.subscribe(() => this.requestUpdate());
    }
    super.updated(changedProps);
  }

  private unsub() {
    this.testUnsub?.();
    this.testUnsub = null;
  }

  private emitCompleted() {
    this.dispatchEvent(
      new CustomEvent('test-completed', { bubbles: true, composed: true }),
    );
  }

  render() {
    const {
      state,
      action,
      pools,
      modifierEffects,
      activeEffects,
      activePool,
      ignoreMods,
      modifiers,
    } = this.test;

    return html`
      <div class="sections">
        <section>
          <span class="vertical-text">${localize('check')}</span>

          <div class="aptitude-info">
            ${renderAutoForm({
              props: state,
              noDebounce: true,
              update: this.test.updateState,
              fields: ({ aptitude, halve }) => [
                renderSelectField(aptitude, enumValues(AptitudeType), {
                  altLabel: (type) => localize('FULL', type),
                }),
                renderLabeledCheckbox(halve),
              ],
            })}

            <sl-group label=${localize('total')}
              >${this.test.aptitudeTotal}</sl-group
            >
          </div>
        </section>

        <div class="actions">
          <span class="vertical-text">${localize('action')}</span>
          ${renderAutoForm({
            props: action,
            noDebounce: true,
            update: this.test.updateAction,
            fields: ({ type, subtype }) => [
              renderSelectField(type, enumValues(ActionType)),
              renderSelectField(subtype, enumValues(ActionSubtype)),
            ],
          })}
        </div>

        ${notEmpty(pools)
          ? html`
              <section class="pools">
                <span class="vertical-text">${localize('pools')}</span>
                <div class="pool-actions">
                  <header>
                    <span class="label">${localize('ignoreMods')}</span>
                    <span class="label">+20 ${localize('bonus')}</span>
                  </header>
                  <ul>
                    ${pools.map(
                      (pool) => html`
                        <wl-list-item>
                          <div>
                            <span
                              >${localize(pool.type)} <value-status value=${pool.available} max=${pool.max}></value-status></span
                            >
                          </div>
                          ${enumValues(PreTestPoolAction).map((action) => {
                            const pair = [pool, action] as const;
                            const active = equals(pair, activePool);
                            return html`
                              <mwc-button
                                slot=${action === PreTestPoolAction.IgnoreMods
                                  ? 'before'
                                  : 'after'}
                                dense
                                ?disabled=${!pool.available}
                                ?outlined=${!active}
                                ?unelevated=${active}
                                class=${classMap({ active })}
                                @click=${() => this.test.toggleActivePool(pair)}
                              >
                                <img height="20px" src=${pool.icon}
                              /></mwc-button>
                            `;
                          })}
                        </wl-list-item>
                      `,
                    )}
                  </ul>
                </div>
              </section>
            `
          : ''}
      </div>

      <section class="modifiers ${classMap({ ignored: ignoreMods })}">
        <sl-header
          itemCount=${withSign(this.test.totalModifiers)}
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
                  this.test.toggleModifier({ ...orig, ...changed }),
                fields: ({ name, value }) => [
                  renderTextField(name, { required: true }),
                  renderNumberField(value, { min: -95, max: 95 }),
                ],
              })}
            </sl-popover-section>`}
          >
            <mwc-icon-button slot="base" icon="add"></mwc-icon-button>
          </sl-popover>
        </sl-header>
        <sl-animated-list transformOrigin="top">
          ${repeat(modifierEffects, identity, (effect) => {
            const useWhen =
              effect.requirement && `${localize('when')} ${effect.requirement}`;
            return html`
              <wl-list-item
                class=${classMap({ tall: !!useWhen })}
                ?clickable=${!!useWhen}
                @click=${() => {
                  useWhen && this.test.toggleActiveEffect(effect);
                }}
              >
                <span
                  slot="before"
                  class=${classMap({
                    tall: !!useWhen,
                    active: !useWhen || activeEffects.has(effect),
                  })}
                ></span>
                <span class="source" title=${effect[Source]}
                  >${effect[Source]}</span
                >
                <span slot="after">${withSign(effect.modifier)}</span>
                ${useWhen
                  ? html`
                      <span class="requirement" title=${useWhen}
                        >${useWhen}</span
                      >
                    `
                  : ''}
              </wl-list-item>
            `;
          })}
          ${repeat(
            modifiers,
            identity,
            (modifier) => html`
              <wl-list-item
                ?clickable=${!!modifier.temporary}
                @click=${() =>
                  modifier.temporary && this.test.toggleModifier(modifier)}
              >
                ${modifier.temporary
                  ? html` <mwc-icon slot="before">close</mwc-icon> `
                  : html` <span slot="before"></span> `}
                <span class="source">${modifier.name}</span>
                <span slot="after">${withSign(modifier.value)}</span>
              </wl-list-item>
            `,
          )}
        </sl-animated-list>
      </section>

      <footer>
        <div class="totals">
          <sl-group label=${localize('target')}>${this.test.target}</sl-group>
        </div>
        <mwc-button @click=${this.emitCompleted} raised
          >${localize('roll')}</mwc-button
        >
      </footer>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'aptitude-check-controls': AptitudeCheckControls;
  }
}
