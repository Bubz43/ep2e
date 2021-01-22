import type { SlWindow } from '@src/components/window/window';
import type { ActorEP, MaybeToken } from '@src/entities/actor/actor';
import { formattedSleeveInfo } from '@src/entities/actor/sleeves';
import { readyCanvas } from '@src/foundry/canvas';
import { localize } from '@src/foundry/localization';
import { overlay } from '@src/init';
import { openMenu } from '@src/open-menu';
import {
  MeleeAttackTest,
  MeleeAttackTestInit,
} from '@src/success-test/melee-attack-test';
import { notEmpty } from '@src/utility/helpers';
import {
  customElement,
  html,
  internalProperty,
  LitElement,
  query,
} from 'lit-element';
import { repeat } from 'lit-html/directives/repeat';
import { identity } from 'remeda';
import type { Subscription } from 'rxjs';
import { traverseActiveElements } from 'weightless';
import styles from './melee-attack-controls.scss';

type Init = {
  entities: {
    actor: ActorEP;
    token?: MaybeToken;
  };
  getState: (actor: ActorEP) => MeleeAttackTestInit | null;
};

@customElement('melee-attack-controls')
export class MeleeAttackControls extends LitElement {
  static get is() {
    return 'melee-attack-controls' as const;
  }

  static get styles() {
    return [styles];
  }

  private static readonly openWindows = new WeakMap<
    ActorEP,
    MeleeAttackControls
  >();

  static openWindow(init: Init) {
    (
      MeleeAttackControls.openWindows.get(init.entities.actor) ||
      new MeleeAttackControls()
    ).setState(init);
  }

  @query('sl-window')
  private win?: SlWindow;

  private subs = new Set<Subscription | Subscription['unsubscribe']>();

  @internalProperty() private test?: MeleeAttackTest;

  connectedCallback() {
    Hooks.on('targetToken', this.setTarget);
    super.connectedCallback();
  }

  disconnectedCallback() {
    this.unsub();
    Hooks.off('targetToken', this.setTarget);
    super.disconnectedCallback();
  }

  private setTarget = () => {
    const attackTarget = this.test?.melee.attackTarget;
    const { targets } = game.user;
    if (attackTarget && !targets.has(attackTarget))
      this.test?.melee.update({ attackTarget: null });
    else if (targets.size)
      this.test?.melee.update({ attackTarget: [...targets][0] });
    this.requestUpdate();
  };

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
      MeleeAttackControls.openWindows.delete(init.entities.actor),
    );
    this.subs.add(
      init.entities.actor.subscribe((actor) => {
        const info = actor && init.getState(actor);
        if (!info) this.win?.close();
        else {
          this.subs.add(
            new MeleeAttackTest(info).subscribe({
              next: (test) => (this.test = test),
              complete: () => this.win?.close(),
            }),
          );
        }
      }),
    );
    if (!this.isConnected) overlay.append(this);
    MeleeAttackControls.openWindows.set(init.entities.actor, this);
    const source = traverseActiveElements();
    if (source instanceof HTMLElement) {
      requestAnimationFrame(() => this.win?.positionAdjacentToElement(source));
    }
  }

  private selectWeapon() {
    if (!this.test) return;
    openMenu({
      header: { heading: `${localize('select')} ${localize('meleeWeapon')}` },
      content: this.test.character.weapons.melee.map((weapon) => ({
        label: weapon.name,
        activated: weapon === this.test?.melee.weapon,
        callback: () => this.test?.melee.update({ weapon }),
      })),
    });
  }

  private startTargetting() {
    const canvas = readyCanvas();
    if (!canvas) return;
    const { activeLayer, stage } = canvas;
    const { view } = canvas.app;
    const { activeTool } = ui.controls;
    const cleanup = () => {
      activeLayer.activate();
      ui.controls.initialize({ tool: activeTool, layer: null, control: null });
      view.removeEventListener('click', cleanup);
      view.removeEventListener('contextmenu', cleanup);
      overlay.faded = false;
    };

    view.addEventListener('click', cleanup);
    view.addEventListener('contextmenu', cleanup);
    canvas.tokens.activate();
    ui.controls.initialize({ tool: 'target', layer: null, control: null });
    overlay.faded = true;
  }

  render() {
    return html`
      <sl-window
        name="${localize('meleeAttack')} ${localize('test')}"
        @sl-window-closed=${this.remove}
        noremove
      >
        ${this.test
          ? html`<div class="controls">${this.renderTest(this.test)}</div>`
          : ''}
      </sl-window>
    `;
  }

  private renderTest(test: NonNullable<MeleeAttackControls['test']>) {
    const {
      character,
      ego,
      token,
      action,
      pools,
      target,
      melee,
      skillState,
    } = test;

    const { weapon, primaryAttack, attackTarget } = melee;
    const { attacks } = weapon;
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
        <!-- <section class="attack">
          <success-test-section-label
            >${localize('attack')}</success-test-section-label
          >
          <ul class="attack-info">
            <wl-list-item class="targetting">
              <mwc-icon-button
                slot="before"
                icon="filter_tilt_shift"
                @click=${this.startTargetting}
              ></mwc-icon-button>
              <span>${localize('target')}: ${attackTarget?.name ?? ' - '}</span>
              <sl-animated-list class="targets">
                ${repeat(
                  game.user.targets,
                  identity,
                  (token) => html`
                    <mwc-icon-button
                      class=${token === attackTarget ? 'active' : ''}
                      @click=${() => melee.update({ attackTarget: token })}
                      ><img src=${token.data.img}
                    /></mwc-icon-button>
                  `,
                )}
              </sl-animated-list>
            </wl-list-item>

            <wl-list-item clickable @click=${this.selectWeapon}>
              ${weapon.name}
            </wl-list-item>
            ${attacks.secondary
              ? html`
                  <wl-list-item
                    class="attack-setting"
                    clickable
                    @click=${() =>
                      melee.update({ primaryAttack: !primaryAttack })}
                  >
                    <span slot="before" class=${primaryAttack ? 'active' : ''}
                      >${attacks.primary.label}</span
                    >
                    <span slot="after" class=${!primaryAttack ? 'active' : ''}
                      >${attacks.secondary.label}</span
                    >
                  </wl-list-item>
                `
              : ''}
          </ul>
        </section> -->

        <section class="skill-section">
          <success-test-section-label
            >${localize('skill')}</success-test-section-label
          >
          <success-test-skill-section
            .ego=${ego}
            .skillState=${skillState}
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
    'melee-attack-controls': MeleeAttackControls;
  }
}
