import { renderNumberField } from '@src/components/field/fields';
import { renderAutoForm } from '@src/components/form/forms';
import type { SlWindow } from '@src/components/window/window';
import { CalledShot, enumValues } from '@src/data-enums';
import type { ActorEP, MaybeToken } from '@src/entities/actor/actor';
import { formattedSleeveInfo } from '@src/entities/actor/sleeves';
import { ItemType } from '@src/entities/entity-types';
import type { ExplosiveSettings } from '@src/entities/weapon-settings';
import { readyCanvas } from '@src/foundry/canvas';
import { localize } from '@src/foundry/localization';
import { overlay } from '@src/init';
import { openMenu } from '@src/open-menu';
import {
  ThrownAttackTest,
  ThrownAttackTestInit,
} from '@src/success-test/thrown-attack-test';
import { notEmpty } from '@src/utility/helpers';
import {
  customElement,
  html,
  internalProperty,
  LitElement,
  query,
} from 'lit-element';
import { repeat } from 'lit-html/directives/repeat';
import { identity, Subscription } from 'rxjs';
import { traverseActiveElements } from 'weightless';
import styles from './thrown-attack-controls.scss';

type Init = {
  entities: {
    actor: ActorEP;
    token?: MaybeToken;
  };
  getState: (actor: ActorEP) => ThrownAttackTestInit | null;
  adjacentElement?: HTMLElement;
};

@customElement('thrown-attack-controls')
export class ThrownAttackControls extends LitElement {
  static get is() {
    return 'thrown-attack-controls' as const;
  }

  static get styles() {
    return [styles];
  }

  private static readonly openWindows = new WeakMap<
    ActorEP,
    ThrownAttackControls
  >();

  static openWindow(init: Init) {
    (
      ThrownAttackControls.openWindows.get(init.entities.actor) ||
      new ThrownAttackControls()
    ).setState(init);
  }

  @query('sl-window')
  private win?: SlWindow;

  private subs = new Set<Subscription | Subscription['unsubscribe']>();

  @internalProperty() private test?: ThrownAttackTest;

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
    const attackTarget = this.test?.throwing.attackTarget;
    const { targets } = game.user;
    if (attackTarget && !targets.has(attackTarget))
      this.test?.throwing.update({ attackTarget: null });
    else if (targets.size)
      this.test?.throwing.update({ attackTarget: [...targets][0] });
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
    console.log(init.adjacentElement);
    this.unsub();
    this.subs.add(() =>
      ThrownAttackControls.openWindows.delete(init.entities.actor),
    );
    this.subs.add(
      init.entities.actor.subscribe((actor) => {
        const info = actor && init.getState(actor);
        if (!info) this.win?.close();
        else {
          this.subs.add(
            new ThrownAttackTest(info).subscribe({
              next: (test) => (this.test = test),
              complete: () => this.win?.close(),
            }),
          );
        }
      }),
    );
    if (!this.isConnected) overlay.append(this);
    ThrownAttackControls.openWindows.set(init.entities.actor, this);
    const source = init.adjacentElement || traverseActiveElements();
    if (source instanceof HTMLElement && source.isConnected) {
      await this.win?.updateComplete;
      this.win?.positionAdjacentToElement(source);
    }
  }

  private selectWeapon() {
    if (!this.test) return;
    const { explosives, thrown } = this.test.character.weapons;
    const throwable = [...thrown, ...explosives.filter((e) => e.isGrenade)];

    openMenu({
      header: { heading: localize('throw') },
      content: throwable.map((weapon) => ({
        label: weapon.fullName,
        sublabel: weapon.fullType,
        activated: weapon === this.test?.throwing.weapon,
        callback: () => this.test?.throwing.update({ weapon }),
        disabled: !weapon.quantity,
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
          callback: () => this.test?.throwing.update({ calledShot: null }),
        },
        ...enumValues(CalledShot).map((shot) => ({
          label: localize(shot),
          activated: shot === this.test?.throwing.calledShot,
          callback: () => this.test?.throwing.update({ calledShot: shot }),
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

  private renderTest(test: NonNullable<ThrownAttackControls['test']>) {
    const {
      character,
      ego,
      token,
      action,
      pools,
      target,
      throwing,
      skillState,
      //  damageFormulas,
      attack,
      canCallShot,
    } = test;

    const {
      weapon,
      primaryAttack,
      attackTarget,
      targetDistance,
      range,
      calledShot,
      explosiveSettings,
    } = throwing;
    const { morphSize } = character;
    const { attacks } = weapon ?? {};

    // const joinedFormula = joinLabeledFormulas(damageFormulas);

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
                    @click=${() => throwing.update({ attackTarget: token })}
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
      </div>
      <success-test-modifiers-section
        class="modifiers"
        ?ignored=${test.ignoreModifiers}
        total=${test.modifierTotal}
        .modifierStore=${test.modifiers}
      ></success-test-modifiers-section>

      <ul class="throwing-info">
        <wl-list-item clickable @click=${this.selectWeapon}>
          ${weapon.name}
        </wl-list-item>
        ${weapon.type === ItemType.Explosive && explosiveSettings
          ? html`
              <explosive-settings-form
                .explosive=${weapon}
                .initialSettings=${explosiveSettings}
                @explosive-settings=${(ev: CustomEvent<ExplosiveSettings>) =>
                  throwing.update({ explosiveSettings: ev.detail })}
              ></explosive-settings-form>
            `
          : attacks?.secondary
          ? html`
              <wl-list-item
                class="attack-setting"
                clickable
                @click=${() =>
                  throwing.update({ primaryAttack: !primaryAttack })}
              >
                ${attack?.label}
              </wl-list-item>
            `
          : ''}

        <li divider></li>
        <li>
          ${renderAutoForm({
            props: { targetDistance, range },
            update: throwing.update,
            fields: ({ targetDistance, range }) => [
              renderNumberField(targetDistance, { min: 0 }),
              renderNumberField(range, { min: 1 }),
            ],
          })}
        </li>
        ${canCallShot
          ? html`
              <wl-list-item clickable @click=${this.selectCalledShot}>
                <span>${localize('calledShot')}</span>
                ${calledShot
                  ? html`<span slot="after">${localize(calledShot)}</span>`
                  : ''}
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
    'thrown-attack-controls': ThrownAttackControls;
  }
}
