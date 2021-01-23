import type { SlWindow } from '@src/components/window/window';
import type { ActorEP, MaybeToken } from '@src/entities/actor/actor';
import { formattedSleeveInfo } from '@src/entities/actor/sleeves';
import { localize } from '@src/foundry/localization';
import { overlay } from '@src/init';
import { SkillTest, SkillTestInit } from '@src/success-test/skill-test';
import { notEmpty } from '@src/utility/helpers';
import {
  customElement,
  html,
  internalProperty,
  LitElement,
  query,
} from 'lit-element';
import type { Subscription } from 'rxjs';
import { traverseActiveElements } from 'weightless';
import styles from './skill-test-controls.scss';

type Init = {
  entities: {
    actor: ActorEP;
    token?: MaybeToken;
  };
  getState: (actor: ActorEP) => SkillTestInit | null;
};

@customElement('skill-test-controls')
export class SkillTestControls extends LitElement {
  static get is() {
    return 'skill-test-controls' as const;
  }

  static get styles() {
    return [styles];
  }

  private static readonly openWindows = new WeakMap<
    ActorEP,
    SkillTestControls
  >();

  static openWindow(init: Init) {
    (
      SkillTestControls.openWindows.get(init.entities.actor) ||
      new SkillTestControls()
    ).setState(init);
  }

  @query('sl-window')
  private win?: SlWindow;

  private subs = new Set<Subscription | Subscription['unsubscribe']>();

  @internalProperty() private test?: SkillTest;

  disconnectedCallback() {
    this.unsub();
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
    this.unsub();
    this.subs.add(() =>
      SkillTestControls.openWindows.delete(init.entities.actor),
    );
    this.subs.add(
      init.entities.actor.subscribe((actor) => {
        const info = actor && init.getState(actor);
        if (!info) this.win?.close();
        else {
          this.subs.add(
            new SkillTest(info).subscribe({
              next: (test) => (this.test = test),
              complete: () => this.win?.close(),
            }),
          );
        }
      }),
    );
    if (!this.isConnected) overlay.append(this);
    SkillTestControls.openWindows.set(init.entities.actor, this);
    const source = traverseActiveElements();
    if (source instanceof HTMLElement) {
      requestAnimationFrame(() => this.win?.positionAdjacentToElement(source));
    }
  }

  render() {
    return html`
      <sl-window
        name=${localize('skillTest')}
        @sl-window-closed=${this.remove}
        noremove
      >
        ${this.test
          ? html`<div class="controls">${this.renderTest(this.test)}</div>`
          : ''}
      </sl-window>
    `;
  }

  private renderTest(test: NonNullable<SkillTestControls['test']>) {
    const { character, ego, token, action, pools, target, skillState } = test;
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
        <section class="skill-section">
          <success-test-section-label
            >${localize('skill')}</success-test-section-label
          >
          <success-test-skill-section
            .skillState=${skillState}
            .ego=${ego}
          ></success-test-skill-section>
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
    'skill-test-controls': SkillTestControls;
  }
}
