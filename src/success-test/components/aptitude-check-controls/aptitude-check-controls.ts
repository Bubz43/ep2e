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

  private emitCompleted() {
    this.dispatchEvent(
      new CustomEvent('test-completed', { bubbles: true, composed: true }),
    );
  }

  render() {
    const {
      state,
      pools,
      modifierEffects,
      activeEffects,
      activePool,
      ignoreMods,
      modifiers,
      character,
      token,
      target
    } = this.test;

    const clamped = successTestTargetClamp(target)
  

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
          <span class="vertical-text">${localize('check')}</span>
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
          <span class="vertical-text">${localize('action')}</span>
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
                <span class="vertical-text">${localize('pools')}</span>
              <success-test-pool-controls .poolState=${{
                pools,
                active: activePool,
                toggleActive: this.test.toggleActivePool
              }}></success-test-pool-controls>
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
                    negative: effect.modifier < 0,
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
                  : modifier.icon
                  ? html`<img src=${modifier.icon} slot="before" />`
                  : html` <span slot="before"></span> `}
                <span class="source">${modifier.name}</span>
                <span slot="after">${withSign(modifier.value)}</span>
              </wl-list-item>
            `,
          )}
        </sl-animated-list>
      </section>

      <footer>
        <div class="target">
          <span class="target-original" ?hidden=${clamped === target}
            >${target}</span
          >
          <span class="target-clamped">${clamped}</span>
          <span class="target-label">${localize('target')}</span>
        </div>
        <div class="settings">
          <button
            @click=${() =>
              openMenu({
                content: enumValues(MessageVisibility).map((option) => ({
                  label: localize(option),
                  callback: () => {
                    this.test.updateState({ visibility: option });
                  },
                  activated: option === state.visibility,
                })),
              })}
          >
            <span class="visibility">${localize(state.visibility)}</span>
            <mwc-icon>keyboard_arrow_down</mwc-icon>
          </button>

          <button
            @click=${() => this.test.updateState({ autoRoll: !state.autoRoll })}
          >
            <mwc-icon class="checkbox"
              >${state.autoRoll
                ? 'check_box'
                : 'check_box_outline_blank'}</mwc-icon
            >
            Auto Roll
          </button>
        </div>
        <mwc-button @click=${this.emitCompleted} raised
          >${localize('start')} ${localize('test')}</mwc-button
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
