import type { SlWindow } from '@src/components/window/window';
import { CalledShot, enumValues } from '@src/data-enums';
import type { ActorEP, MaybeToken } from '@src/entities/actor/actor';
import { formattedSleeveInfo } from '@src/entities/actor/sleeves';
import { AggressiveOption } from '@src/entities/weapon-settings';
import { readyCanvas } from '@src/foundry/canvas';
import { localize } from '@src/foundry/localization';
import { joinLabeledFormulas } from '@src/foundry/rolls';
import { overlay, tooltip } from '@src/init';
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

  private selectCalledShot() {
    if (!this.test) return;
    openMenu({
      header: { heading: localize('calledShot') },
      content: [
        {
          label: localize('clear'),
          callback: () => this.test?.melee.update({ calledShot: null }),
        },
        ...enumValues(CalledShot).map((shot) => ({
          label: localize(shot),
          activated: shot === this.test?.melee.calledShot,
          callback: () => this.test?.melee.update({ calledShot: shot }),
        })),
      ],
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
      damageFormulas,
      attack,
    } = test;

    const {
      weapon,
      primaryAttack,
      attackTarget,
      aggressive,
      charging,
      extraWeapon,
      touchOnly,
      calledShot,
      oneHanded,
    } = melee;
    const { attacks, isTwoHanded } = weapon;
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
            .ego=${ego}
            .skillState=${skillState}
          ></success-test-skill-section>
        </section>

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
                    @click=${() => melee.update({ attackTarget: token })}
                    ><img src=${token.data.img}
                  /></mwc-icon-button>
                `,
              )}
            </sl-animated-list>
          </wl-list-item>
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

      <ul class="melee-info">
        <wl-list-item clickable @click=${this.selectWeapon}>
          ${weapon.name}
        </wl-list-item>
        ${attacks.secondary
          ? html`
              <wl-list-item
                class="attack-setting"
                clickable
                @click=${() => melee.update({ primaryAttack: !primaryAttack })}
              >
                ${attack.label}
              </wl-list-item>
            `
          : ''}
        ${isTwoHanded
          ? html`
              <mwc-check-list-item
                ?selected=${!oneHanded}
                @click=${() => melee.update({ oneHanded: !oneHanded })}
              >
                <span>${localize('twoHanded')}</span>
              </mwc-check-list-item>
            `
          : ''}
        <li divider></li>
        <wl-list-item clickable @click=${this.selectCalledShot}>
          <span>${localize('calledShot')}</span>
          ${calledShot
            ? html`<span slot="after">${localize(calledShot)}</span>`
            : ''}
        </wl-list-item>
        <wl-list-item class="aggressive">
          <span>${localize('aggressive')} </span>
          <span slot="after">
            <button
              @click=${() =>
                melee.update({
                  aggressive:
                    aggressive === AggressiveOption.Modifier
                      ? null
                      : AggressiveOption.Modifier,
                })}
              class=${aggressive === AggressiveOption.Modifier ? 'active' : ''}
            >
              +10
            </button>
            /
            <button
              @click=${() =>
                melee.update({
                  aggressive:
                    aggressive === AggressiveOption.Damage
                      ? null
                      : AggressiveOption.Damage,
                })}
              class=${aggressive === AggressiveOption.Damage ? 'active' : ''}
            >
              +1d10 DV
            </button></span
          >
        </wl-list-item>
        <mwc-check-list-item
          ?selected=${!!charging}
          @click=${() => melee.update({ charging: !charging })}
        >
          <span>${localize('charging')}</span>
        </mwc-check-list-item>
        <mwc-check-list-item
          ?selected=${!!extraWeapon}
          @click=${() => melee.update({ extraWeapon: !extraWeapon })}
        >
          <span>${localize('extraWeapon')}</span>
        </mwc-check-list-item>
        <mwc-check-list-item
          ?selected=${!!touchOnly}
          @click=${() => melee.update({ touchOnly: !touchOnly })}
        >
          <span>${localize('touchOnly')}</span>
        </mwc-check-list-item>
        <li divider></li>

        <wl-list-item
          @mouseover=${(ev: Event & { currentTarget: HTMLElement }) => {
            tooltip.attach({
              el: ev.currentTarget,
              content: html`
                <dl>
                  ${touchOnly ? html`
                  <dt>${localize("touchOnly")}</dt>
                  <dd>${localize("noDamage")}</dd>
                  ` : damageFormulas.map(
                    ({ label, formula }) => html`
                      <dt>${label}</dt>
                      <dd>${formula}</dd>
                    `,
                  )}
                </dl>
              `,
            });
          }}
        >
          <span class="damage-value"
            >${localize('SHORT', 'damageValue')}:
            ${touchOnly ? '-' : joinLabeledFormulas(damageFormulas)}</span
          >
        </wl-list-item>
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
    'melee-attack-controls': MeleeAttackControls;
  }
}
