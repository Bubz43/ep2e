import type { SlWindow } from '@src/components/window/window';
import type { ActorEP, MaybeToken } from '@src/entities/actor/actor';
import { formattedSleeveInfo } from '@src/entities/actor/sleeves';
import { localize } from '@src/foundry/localization';
import { overlay } from '@src/init';
import { PsiTest, PsiTestInit } from '@src/success-test/psi-test';
import {
  customElement,
  html,
  internalProperty,
  LitElement,
  PropertyValues,
  query,
} from 'lit-element';
import type { Subscription } from 'rxjs';
import { traverseActiveElements } from 'weightless';
import styles from './psi-test-controls.scss';

type Init = {
  entities: PsiTestControls['entities'];
  getState: PsiTestControls['getState'];
  relativeEl?: HTMLElement;
};

@customElement('psi-test-controls')
export class PsiTestControls extends LitElement {
  static get is() {
    return 'psi-test-controls' as const;
  }

  static get styles() {
    return [styles];
  }

  private static readonly openWindows = new WeakMap<ActorEP, PsiTestControls>();

  static openWindow(init: Init) {
    let win = PsiTestControls.openWindows.get(init.entities.actor);

    if (!win) {
      win = new PsiTestControls();
      overlay.append(win);
      PsiTestControls.openWindows.set(init.entities.actor, win);
    }

    win.setState(init);
  }

  @internalProperty() private entities!: {
    actor: ActorEP;
    token?: MaybeToken;
  };

  @internalProperty() private getState!: (actor: ActorEP) => PsiTestInit | null;

  @query('sl-window')
  private win?: SlWindow;

  private subs = new Set<Subscription | Subscription['unsubscribe']>();

  @internalProperty() private test?: PsiTest;

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
              new PsiTest({
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
    PsiTestControls.openWindows.delete(this.entities.actor);
    super.disconnectedCallback();
  }

  private unsub() {
    this.subs.forEach((unsub) => {
      if ('unsubscribe' in unsub) unsub.unsubscribe();
      else unsub();
    });
    this.subs.clear();
  }

  async setState(init: Init) {
    this.entities = init.entities;
    this.getState = init.getState;
    const source = init.relativeEl || traverseActiveElements();
    if (source instanceof HTMLElement && source.isConnected) {
      await this.win?.updateComplete;
      this.win?.positionAdjacentToElement(source);
    }
  }

  render() {
    return html`
      <sl-window
        name=${localize('psiTest')}
        @sl-window-closed=${this.remove}
        noremove
      >
        ${this.test
          ? html`<div class="controls">${this.renderTest(this.test)}</div>`
          : ''}
      </sl-window>
    `;
  }

  private renderTest(test: PsiTest) {
    const { entities } = this;
    const { character, target } = test;

    return html` <mwc-list-item
        class="entity"
        @click=${() => character.actor.sheet.render(true)}
        graphic="medium"
        ?twoline=${!!character.sleeve}
      >
        <img slot="graphic" src=${entities.token?.data.img ?? character.img} />
        <span>${entities.token?.data.name ?? character.name} </span>
        ${character.sleeve
          ? html`<span slot="secondary"
              >${formattedSleeveInfo(character.sleeve).join(' - ')}</span
            >`
          : ''}
      </mwc-list-item>
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
      ></success-test-footer>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'psi-test-controls': PsiTestControls;
  }
}
