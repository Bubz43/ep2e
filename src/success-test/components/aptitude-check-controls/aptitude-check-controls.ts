import {
  renderSelectField,
  renderLabeledCheckbox,
} from '@src/components/field/fields';
import { renderAutoForm } from '@src/components/form/forms';
import { enumValues, AptitudeType } from '@src/data-enums';
import { ActionType, ActionSubtype } from '@src/features/actions';
import { Source } from '@src/features/effects';
import { localize } from '@src/foundry/localization';
import type { AptitudeCheck } from '@src/success-test/aptitude-check';
import { notEmpty } from '@src/utility/helpers';
import {
  customElement,
  LitElement,
  property,
  html,
  PropertyValues,
} from 'lit-element';
import { repeat } from 'lit-html/directives/repeat';
import { identity } from 'remeda';
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

  render() {
    const {
      ego,
      state,
      action,
      pools,
      aptitudeTotal,
      modifierEffects,
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
                <ul>
                  ${pools.map(
                    (pool) => html`
                      <li class="pool">
                        <pool-item .pool=${pool}></pool-item>
                        <div>
                          <mwc-formfield label="+20"
                            ><mwc-radio ?disabled=${!pool.available}></mwc-radio
                          ></mwc-formfield>
                          <mwc-formfield label="Ignore Mods"
                            ><mwc-radio ?disabled=${!pool.available}></mwc-radio
                          ></mwc-formfield>
                        </div>
                      </li>
                    `,
                  )}
                </ul>
              </section>
            `
          : ''}
      </div>

      <section class="modifiers">
        <sl-header heading=${localize('modifiers')}></sl-header>
        <sl-animated-list>
          ${repeat(
            modifierEffects,
            identity,
            (effect) => html`
              <wl-list-item ?clickable=${!!effect.requirement}>
                <span>${effect[Source]}</span>
                <span slot="after">${effect.modifier}</span>
              </wl-list-item>
            `,
          )}
        </sl-animated-list>
      </section>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'aptitude-check-controls': AptitudeCheckControls;
  }
}
