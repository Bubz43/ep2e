import { SlWindow } from '@src/components/window/window';
import type { ActorEP, MaybeToken } from '@src/entities/actor/actor';
import { formattedSleeveInfo } from '@src/entities/actor/sleeves';
import { readyCanvas } from '@src/foundry/canvas';
import { localize } from '@src/foundry/localization';
import { overlay } from '@src/init';
import { openMenu } from '@src/open-menu';
import { HackingTest, HackingTestInit } from '@src/success-test/hacking-test';
import { notEmpty } from '@src/utility/helpers';
import { customElement, html, LitElement, query, state } from 'lit-element';
import { repeat } from 'lit-html/directives/repeat';
import { identity, Subscription } from 'rxjs';
import { traverseActiveElements } from 'weightless';
import styles from './hacking-test-controls.scss';

type Init = {
  entities: {
    actor: ActorEP;
    token?: MaybeToken;
  };
  getState: (actor: ActorEP) => HackingTestInit | null;
};

@customElement('hacking-test-controls')
export class HackingTestControls extends LitElement {
  static get is() {
    return 'hacking-test-controls' as const;
  }

  static get styles() {
    return [styles];
  }

  private static readonly openWindows = new WeakMap<
    ActorEP,
    HackingTestControls
  >();

  static openWindow(init: Init) {
    (
      HackingTestControls.openWindows.get(init.entities.actor) ||
      new HackingTestControls()
    ).setState(init);
  }

  @query('sl-window')
  private win?: SlWindow;

  private subs = new Set<Subscription | Subscription['unsubscribe']>();

  @state() private test?: HackingTest;

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
    const attackTarget = this.test?.hack.attackTarget;
    const { targets } = game.user;
    if (attackTarget && !targets.has(attackTarget))
      this.test?.hack.update({ attackTarget: null });
    else if (targets.size)
      this.test?.hack.update({ attackTarget: [...targets][0] });
    this.requestUpdate();
  };

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
      HackingTestControls.openWindows.delete(init.entities.actor),
    );
    this.subs.add(
      init.entities.actor.subscribe((actor) => {
        const info = actor && init.getState(actor);
        if (!info) this.win?.close();
        else {
          this.subs.add(
            new HackingTest(info).subscribe({
              next: (test) => (this.test = test),
              complete: () => this.win?.close(),
            }),
          );
        }
      }),
    );
    if (!this.isConnected) SlWindow.container.append(this);
    HackingTestControls.openWindows.set(init.entities.actor, this);
    const source = traverseActiveElements();
    if (source instanceof HTMLElement && source.isConnected) {
      await this.win?.updateComplete;
      this.win?.positionAdjacentToElement(source);
    }
  }

  private selectSoftware() {
    if (!this.test) return;
    openMenu({
      header: { heading: `${localize('select')} ${localize('software')}` },
      content: this.test.character.weapons.software.map((software) => ({
        label: software.name,
        activated: software === this.test?.hack.software,
        callback: () => this.test?.hack.update({ software }),
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
        name="${localize('hacking')} ${localize('test')}"
        @sl-window-closed=${this.remove}
        noremove
      >
        ${this.test
          ? html`<div class="controls">${this.renderTest(this.test)}</div>`
          : ''}
      </sl-window>
    `;
  }

  private renderTest(test: NonNullable<HackingTestControls['test']>) {
    const {
      character,
      ego,
      token,
      action,
      pools,
      target,
      hack,
      skillState,
      attack,
    } = test;

    const { software, primaryAttack, attackTarget } = hack;
    const { attacks } = software ?? {};

    return html`
      ${character
        ? html`
            <mwc-list-item
              class="entity"
              @click=${() => character.actor.sheet.render(true)}
              graphic="medium"
              ?twoline=${!!character.sleeve}
            >
              <img slot="graphic" src=${token?.texture.src ?? character.img} />
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
      <div class="sections">
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
            fullMoveLabel=${test.fullMoveModifier.name}
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

        <section class="targetting">
          <success-test-section-label @click=${this.startTargetting}
            ><mwc-icon>filter_tilt_shift</mwc-icon></success-test-section-label
          >

          <wl-list-item>
            <span>${localize('target')}: ${attackTarget?.name ?? ' - '}</span>
            <sl-animated-list class="targets">
              ${repeat(
                game.user.targets,
                identity,
                (token) => html`
                  <mwc-icon-button
                    class=${token === attackTarget ? 'active' : ''}
                    @click=${() => hack.update({ attackTarget: token })}
                    ><img
                      src=${token.document.texture.src || CONST.DEFAULT_TOKEN}
                  /></mwc-icon-button>
                `,
              )}
            </sl-animated-list>
          </wl-list-item>
        </section>
      </div>

      <success-test-modifiers-section
        class="modifiers"
        ?ignored=${test.ignoreModifiers}
        total=${test.modifierTotal}
        .modifierStore=${test.modifiers}
      ></success-test-modifiers-section>

      <ul class="hack-info">
        <wl-list-item clickable @click=${this.selectSoftware}>
          ${software?.name || '-'}
        </wl-list-item>

        ${attacks?.secondary
          ? html`
              <wl-list-item
                class="attack-setting"
                clickable
                @click=${() => hack.update({ primaryAttack: !primaryAttack })}
              >
                ${attack?.label}
              </wl-list-item>
            `
          : ''}
      </ul>

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
    'hacking-test-controls': HackingTestControls;
  }
}
