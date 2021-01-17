import {
  renderNumberField,
  renderSelectField,
  renderTextField
} from '@src/components/field/fields';
import { renderAutoForm } from '@src/components/form/forms';
import type { SlWindow } from '@src/components/window/window';
import { AptitudeType, enumValues } from '@src/data-enums';
import type { ActorEP, MaybeToken } from '@src/entities/actor/actor';
import type { Ego } from '@src/entities/actor/ego';
import type { Character } from '@src/entities/actor/proxies/character';
import { formattedSleeveInfo } from '@src/entities/actor/sleeves';
import { localize } from '@src/foundry/localization';
import { overlay } from '@src/init';
import { AptitudeCheck } from '@src/success-test/aptitude-check';
import { notEmpty } from '@src/utility/helpers';
import {
  customElement,
  html,
  internalProperty,
  LitElement,
  PropertyValues,
  query
} from 'lit-element';
import type { Subscription } from 'rxjs';
import { traverseActiveElements } from 'weightless';
import styles from './aptitude-check-controls.scss';

type Init = {
  entities: AptitudeCheckControls['entities'];
  getState: AptitudeCheckControls['getState'];
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

  static openWindow(init: Init) {
    let win = AptitudeCheckControls.openWindows.get(init.entities.actor);

    if (!win) {
      win = new AptitudeCheckControls();
      overlay.append(win);
      AptitudeCheckControls.openWindows.set(init.entities.actor, win);
    }
    const source = traverseActiveElements();
    if (source instanceof HTMLElement) {
      requestAnimationFrame(() => win!.win?.positionAdjacentToElement(source));
    }
    win.setState(init);
  }

  @internalProperty() private entities!: {
    actor: ActorEP;
    token?: MaybeToken;
  };

  @internalProperty() private getState!: (
    actor: ActorEP,
  ) => {
    ego: Ego;
    character?: Character;
    aptitude: AptitudeType;
    // TODO Item source
  } | null;

  @query('sl-window')
  private win?: SlWindow;

  private subs = new Set<Subscription | Subscription['unsubscribe']>();

  @internalProperty() private test?: AptitudeCheck;

  update(changedProps: PropertyValues<this>) {
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
    const { character, ego, action, pools, target, aptitude } = test;
    const { token } = this.entities;

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
            props: aptitude,
            storeOnInput: true,
            noDebounce: true,
            update: aptitude.update,
            fields: ({ type, multiplier }) => [
              renderSelectField(type, enumValues(AptitudeType), {
                altLabel: (type) => localize('FULL', type),
                helpText: `${localize('points')}: ${ego.aptitudes[type.value]}`,
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
