import type { SlWindow } from '@src/components/window/window';
import type { ActorEP } from '@src/entities/actor/actor';
import { formattedSleeveInfo } from '@src/entities/actor/sleeves';
import { localize } from '@src/foundry/localization';
import { overlay } from '@src/init';
import {
  SoftwareSkillTest,
  SoftwareSkillTestInit,
} from '@src/success-test/software-skill-test';
import { notEmpty, withSign } from '@src/utility/helpers';
import {
  customElement,
  html,
  internalProperty,
  LitElement,
  query,
} from 'lit-element';
import { ifDefined } from 'lit-html/directives/if-defined';
import type { Subscription } from 'rxjs';
import { traverseActiveElements } from 'weightless';
import styles from './software-skill-test-controls.scss';

type Init = {
  entities: {
    actor: ActorEP;
  };
  getState: (actor: ActorEP) => SoftwareSkillTestInit | null;
  relativeEl?: HTMLElement;
};

@customElement('software-skill-test-controls')
export class SoftwareSkillTestControls extends LitElement {
  static get is() {
    return 'software-skill-test-controls' as const;
  }

  static get styles() {
    return [styles];
  }

  private static readonly openWindows = new WeakMap<
    ActorEP,
    SoftwareSkillTestControls
  >();

  static openWindow(init: Init) {
    (
      SoftwareSkillTestControls.openWindows.get(init.entities.actor) ||
      new SoftwareSkillTestControls()
    ).setState(init);
  }

  @query('sl-window')
  private win?: SlWindow;

  private subs = new Set<Subscription | Subscription['unsubscribe']>();

  @internalProperty() private test?: SoftwareSkillTest;

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

  async setState(init: Init) {
    this.unsub();
    this.subs.add(() =>
      SoftwareSkillTestControls.openWindows.delete(init.entities.actor),
    );
    this.subs.add(
      init.entities.actor.subscribe((actor) => {
        const info = actor && init.getState(actor);
        if (!info) this.win?.close();
        else {
          this.subs.add(
            new SoftwareSkillTest(info).subscribe({
              next: (test) => (this.test = test),
              complete: () => this.win?.close(),
            }),
          );
        }
      }),
    );
    if (!this.isConnected) overlay.append(this);
    SoftwareSkillTestControls.openWindows.set(init.entities.actor, this);
    const source = init.relativeEl || traverseActiveElements();
    if (source instanceof HTMLElement && source.isConnected) {
      await this.win?.updateComplete;
      this.win?.positionAdjacentToElement(source);
    }
  }

  render() {
    return html` <sl-window
      name="${localize('software')} ${localize('skillTest')}"
      @sl-window-closed=${this.remove}
      noremove
    >
      ${this.test
        ? html`<div class="controls">${this.renderTest(this.test)}</div>`
        : ''}
    </sl-window>`;
  }

  private renderTest(test: NonNullable<SoftwareSkillTestControls['test']>) {
    const {
      character,
      token,
      action,
      pools,
      target,
      skillState,
      software,
    } = test;

    const { skill, applySpecialization } = skillState;
    return html`
      <div class="entities">
        <mwc-list-item
          @click=${() => character.actor.sheet.render(true)}
          graphic="medium"
          ?twoline=${!!character.sleeve}
        >
          <img slot="graphic" src=${token?.data.img ?? character.img} />
          <span>${token?.data.name ?? character.name} </span>
          ${character.sleeve
            ? html`<span slot="secondary"
                >${formattedSleeveInfo(
                  character.sleeve,
                  character.vehicle,
                ).join(' - ')}</span
              >`
            : ''}
        </mwc-list-item>
        <mwc-list-item
          graphic=${ifDefined(software.nonDefaultImg ? 'icon' : undefined)}
        >
          ${software.nonDefaultImg
            ? html`<img src=${software.nonDefaultImg} slot="graphic" />`
            : ''}
          <span>${software.name}</span>
        </mwc-list-item>
      </div>

      <div class="sections">
        <section class="skill-section">
          <success-test-section-label
            >${localize('skill')}</success-test-section-label
          >
          <ul class="skill-state">
            <wl-list-item>
              <span>${skill.name}</span>
              <span slot="after">${skill.total}</span>
            </wl-list-item>
            ${skill.specialization
              ? html`
                  <wl-list-item
                    clickable
                    @click=${skillState.toggleSpecialization}
                  >
                    <mwc-checkbox
                      slot="before"
                      ?checked=${applySpecialization}
                    ></mwc-checkbox>
                    <span>
                      <span>${skill.specialization}</span>
                      <span class="category"
                        >${localize('specialization')}</span
                      ></span
                    >
                    <span slot="after">${withSign(10)}</span>
                  </wl-list-item>
                `
              : ''}
          </ul>
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
    'software-skill-test-controls': SoftwareSkillTestControls;
  }
}
