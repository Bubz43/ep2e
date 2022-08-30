import {
  renderNumberField,
  renderSelectField,
  renderTextField,
} from '@src/components/field/fields';
import { renderAutoForm } from '@src/components/form/forms';
import type { SlWindow } from '@src/components/window/window';
import { lastClickedEl } from '@src/components/window/window-controls';
import { AptitudeType, enumValues } from '@src/data-enums';
import type { ActorEP, MaybeToken } from '@src/entities/actor/actor';
import { formattedSleeveInfo } from '@src/entities/actor/sleeves';
import { localize } from '@src/foundry/localization';
import { overlay } from '@src/init';
import {
  AptitudeCheck,
  AptitudeCheckInit,
} from '@src/success-test/aptitude-check';
import { notEmpty } from '@src/utility/helpers';
import {
  customElement,
  html,
  LitElement,
  PropertyValues,
  query,
  state,
} from 'lit-element';
import { ifDefined } from 'lit-html/directives/if-defined';
import type { Subscription } from 'rxjs';
import { traverseActiveElements } from 'weightless';
import styles from './aptitude-check-controls.scss';

type Init = {
  entities: AptitudeCheckControls['entities'];
  getState: AptitudeCheckControls['getState'];
  relativeEl?: HTMLElement;
};

@customElement('aptitude-check-controls')
export class AptitudeCheckControls extends LitElement {
  static get is() {
    return 'aptitude-check-controls' as const;
  }

  static get styles() {
    return [styles];
  }

  private static readonly openWindows = new WeakMap<
    ActorEP,
    AptitudeCheckControls
  >();

  static async openWindow(init: Init) {
    let win = AptitudeCheckControls.openWindows.get(init.entities.actor);

    if (!win) {
      win = new AptitudeCheckControls();
      overlay.append(win);
      AptitudeCheckControls.openWindows.set(init.entities.actor, win);
    }
    const source = init.relativeEl || traverseActiveElements();
    if (
      source instanceof HTMLElement &&
      source.isConnected &&
      source.parentElement
    ) {
      await win.win?.updateComplete;
      win!.win?.positionAdjacentToElement(source);
    }

    win.setState(init);
  }

  @state() private entities!: {
    actor: ActorEP;
    token?: MaybeToken;
  };

  @state() private getState!: (actor: ActorEP) => AptitudeCheckInit | null;

  @query('sl-window')
  private win?: SlWindow;

  private subs = new Set<Subscription | Subscription['unsubscribe']>();

  @state() private test?: AptitudeCheck;

  update(
    changedProps: PropertyValues<
      this & { entities: { actor: ActorEP; token?: MaybeToken } }
    >,
  ) {
    if (changedProps.has('entities')) {
      this.unsub();
      this.subs.add(
        this.entities.actor.subscribe((actor) => {
          const info = actor && this.getState(actor);
          if (!info) this.win?.close();
          else {
            this.subs.add(
              new AptitudeCheck({
                ...info,
              }).subscribe({
                next: (test) => (this.test = test),
                complete: () => this.win?.close(),
              }),
            );
          }
        }),
      );
    }

    super.update(changedProps);
  }

  disconnectedCallback() {
    this.unsub();
    AptitudeCheckControls.openWindows.delete(this.entities.actor);
    super.disconnectedCallback();
  }

  private unsub() {
    this.subs.forEach((unsub) => {
      if ('unsubscribe' in unsub) unsub.unsubscribe();
      else unsub();
    });
    this.subs.clear();
  }

  setState(init: Init) {
    this.entities = init.entities;
    this.getState = init.getState;
  }

  render() {
    return html`
      <sl-window
        name="${localize('successTest')} - ${localize('aptitudeCheck')}"
        @sl-window-closed=${this.remove}
        noremove
      >
        ${this.test
          ? html`<div class="controls">${this.renderTest(this.test)}</div>`
          : ''}
      </sl-window>
    `;
  }

  renderTest(test: NonNullable<AptitudeCheckControls['test']>) {
    const {
      character,
      ego,
      action,
      pools,
      target,
      aptitude,
      special,
      techSource,
    } = test;
    const { token } = this.entities;

    return html`
      <div class="entities">
        ${character
          ? html`
              <mwc-list-item
                class="entity"
                @click=${() => character.actor.sheet.render(true)}
                graphic="medium"
                ?twoline=${!!character.sleeve}
              >
                <img slot="graphic" src=${token?.img ?? character.img} />
                <span>${token?.name ?? character.name} </span>
                ${character.sleeve
                  ? html`<span slot="secondary"
                      >${formattedSleeveInfo(
                        character.sleeve,
                        character.vehicle,
                      ).join(' - ')}</span
                    >`
                  : ''}
              </mwc-list-item>
            `
          : ''}
        ${techSource
          ? html`
              <mwc-list-item
                graphic=${ifDefined(
                  techSource.nonDefaultImg ? 'icon' : undefined,
                )}
              >
                ${techSource.nonDefaultImg
                  ? html`<img src=${techSource.nonDefaultImg} slot="graphic" />`
                  : ''}
                <span>${techSource.name} - ${localize('onboardALI')}</span>
              </mwc-list-item>
            `
          : ''}
      </div>

      <div class="sections">
        <section>
          <success-test-section-label
            >${localize('check')}</success-test-section-label
          >
          <div>
            ${renderAutoForm({
              classes: 'aptitude-info',
              props: aptitude,
              storeOnInput: true,
              noDebounce: true,
              update: aptitude.update,
              fields: ({ type, multiplier }) => [
                renderSelectField(type, enumValues(AptitudeType), {
                  altLabel: (type) => localize('FULL', type),
                  helpText: `${localize('points')}: ${
                    ego.aptitudes[type.value]
                  }`,
                  helpPersistent: true,
                }),
                renderNumberField(multiplier, { min: 1.5, max: 3, step: 1.5 }),
                renderTextField(
                  {
                    label: localize('total'),
                    value: String(test.basePoints),
                    prop: '',
                  },
                  { readonly: true },
                ),
              ],
            })}
            ${special
              ? html`
                  <p class="special">
                    ${localize('versus')} ${localize(special.type)}
                  </p>
                `
              : ''}
          </div>
        </section>

        <section class="actions">
          <success-test-section-label
            >${localize('action')}</success-test-section-label
          >

          <success-test-action-form
            .action=${action}
          ></success-test-action-form>
        </section>

        ${notEmpty(pools.available)
          ? html`
              <section class="pools">
                <success-test-section-label
                  >${localize('pools')}</success-test-section-label
                >

                <success-test-pool-controls
                  .poolState=${pools}
                ></success-test-pool-controls>
              </section>
            `
          : ''}
      </div>

      <success-test-modifiers-section
        class="modifiers"
        ?ignored=${test.ignoreModifiers}
        total=${test.modifierTotal}
        .modifierStore=${test.modifiers}
      ></success-test-modifiers-section>

      <success-test-footer
        class="footer"
        target=${target}
        .settings=${test.settings}
      ></success-test-footer>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'aptitude-check-controls': AptitudeCheckControls;
  }
}
