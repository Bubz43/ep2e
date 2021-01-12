import { MessageVisibility } from '@src/chat/create-message';
import {
  renderLabeledCheckbox,
  renderNumberField,
  renderSelectField,
  renderSlider,
  renderTextField,
  renderTimeField,
} from '@src/components/field/fields';
import { renderAutoForm, renderSubmitForm } from '@src/components/form/forms';
import { AptitudeType, enumValues } from '@src/data-enums';
import { formattedSleeveInfo } from '@src/entities/actor/sleeves';
import { ActionSubtype, ActionType } from '@src/features/actions';
import { Source } from '@src/features/effects';
import { PreTestPoolAction } from '@src/features/pool';
import { localize } from '@src/foundry/localization';
import { openMenu } from '@src/open-menu';
import type { AptitudeCheck } from '@src/success-test/aptitude-check';
import { successTestTargetClamp } from '@src/success-test/success-test';
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

  render() {
    const {
      state,
      pools,
      activePool,
      ignoreMods,
      character,
      token,
      target,
    } = this.test;

    return html`
      ${character
        ? html`
            <mwc-list-item
              class="entity"
              @click=${() => character.actor.sheet.render(true)}
              graphic="medium"
              ?twoline=${!!character.sleeve}
            >
              <img slot="graphic" src=${token?.data.img ?? character.img} />
              <span>${token?.data.name ?? character.name} </span>
              ${character.sleeve
                ? html`<span slot="secondary"
                    >${formattedSleeveInfo(character.sleeve).join(' - ')}</span
                  >`
                : ''}
            </mwc-list-item>
          `
        : ''}

      <div class="sections">
        <section>
          <success-test-section-label
            >${localize('check')}</success-test-section-label
          >
          ${renderAutoForm({
            classes: 'aptitude-info',
            props: state,
            storeOnInput: true,
            noDebounce: true,
            update: this.test.updateState,
            fields: ({ aptitude, multiplier }) => [
              renderSelectField(aptitude, enumValues(AptitudeType), {
                altLabel: (type) => localize('FULL', type),
                helpText: `${localize('points')}: ${
                  this.test.ego.aptitudes[aptitude.value]
                }`,
                helpPersistent: true,
              }),
              renderNumberField(multiplier, { min: 1.5, max: 3, step: 1.5 }),
              renderTextField(
                {
                  label: localize('total'),
                  value: String(this.test.aptitudeTotal),
                  prop: '',
                },
                { readonly: true },
              ),
            ],
          })}
        </section>

        <div class="actions">
          <success-test-section-label
            >${localize('action')}</success-test-section-label
          >

          <success-test-action-form
            .actionState=${{
              action: this.test.action,
              setAction: this.test.updateAction,
            }}
          ></success-test-action-form>
        </div>

        ${notEmpty(pools)
          ? html`
              <section class="pools">
                <success-test-section-label
                  >${localize('pools')}</success-test-section-label
                >

                <success-test-pool-controls
                  .poolState=${{
                    pools,
                    active: activePool,
                    toggleActive: this.test.toggleActivePool,
                  }}
                ></success-test-pool-controls>
              </section>
            `
          : ''}
      </div>

      <success-test-modifiers-section
        class="modifiers"
        ?ignored=${ignoreMods}
        total=${this.test.totalModifiers}
        .modifierStore=${{
          effects: this.test.modifierEffects,
          toggleEffect: this.test.toggleActiveEffect,
          modifiers: this.test.modifiers,
          toggleModifier: this.test.toggleModifier,
        }}
      ></success-test-modifiers-section>

      <success-test-footer
        class="footer"
        target=${target}
        .rollState=${{
          visibility: state.visibility,
          autoRoll: state.autoRoll,
          update: this.test.updateState,
        }}
      ></success-test-footer>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'aptitude-check-controls': AptitudeCheckControls;
  }
}
