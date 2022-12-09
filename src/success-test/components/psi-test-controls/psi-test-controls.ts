import {
  renderLabeledCheckbox,
  renderNumberField,
  renderSelectField,
} from '@src/components/field/fields';
import { renderAutoForm } from '@src/components/form/forms';
import type { SlWindow } from '@src/components/window/window';
import { enumValues, PoolType, PsiPush } from '@src/data-enums';
import type { ActorEP, MaybeToken } from '@src/entities/actor/actor';
import { formattedSleeveInfo } from '@src/entities/actor/sleeves';
import { readyCanvas } from '@src/foundry/canvas';
import { localize } from '@src/foundry/localization';
import { overlay, tooltip } from '@src/init';
import { openMenu } from '@src/open-menu';
import { PsiTest, PsiTestInit } from '@src/success-test/psi-test';
import { notEmpty } from '@src/utility/helpers';
import {
  customElement,
  html,
  LitElement,
  PropertyValues,
  query,
  state,
} from 'lit-element';
import { repeat } from 'lit-html/directives/repeat';
import { compact, identity, take } from 'remeda';
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

  @state() private entities!: {
    actor: ActorEP;
    token?: MaybeToken;
  };

  @state() private getState!: (actor: ActorEP) => PsiTestInit | null;

  @query('sl-window')
  private win?: SlWindow;

  private subs = new Set<Subscription | Subscription['unsubscribe']>();

  @state() private test?: PsiTest;

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

  connectedCallback() {
    Hooks.on('targetToken', this.setTarget);
    super.connectedCallback();
  }

  disconnectedCallback() {
    this.unsub();
    Hooks.off('targetToken', this.setTarget);

    PsiTestControls.openWindows.delete(this.entities.actor);
    super.disconnectedCallback();
  }

  private setTarget = () => {
    const attackTarget = this.test?.use.attackTargets;
    const { targets } = game.user;
    this.test?.use.update({
      attackTargets: new Set(
        take([...targets], this.test?.use.maxTargets || 1),
      ),
    });

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
    this.entities = init.entities;
    this.getState = init.getState;
    const source = init.relativeEl || traverseActiveElements();
    if (source instanceof HTMLElement && source.isConnected) {
      await this.win?.updateComplete;
      this.win?.positionAdjacentToElement(source);
    }
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

  private selectSleight() {
    if (!this.test) return;

    openMenu({
      header: { heading: localize('sleight') },
      content: this.test.character.activatedSleights.map((sleight) => ({
        label: sleight.fullName,
        sublabel: sleight.fullType,
        activated: sleight === this.test?.use.sleight,
        callback: () => this.test?.use.update({ sleight }),
      })),
    });
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
    const {
      character,
      ego,
      token,
      action,
      pools,
      target,
      skillState,
      use,
      freePush,
      psi,
      fullSideEffectNegationPoints,
    } = test;

    const {
      attackTargets,
      targetDistance,
      range,
      sleight,
      maxTargets,
      targetingAsync,
      targetingSelf,
      touchingTarget,
      push,
      sideEffectNegation: pushPools,
    } = use;

    const maxPsiPushPools = Math.min(
      2,
      (pools.available.find((p) => p.type !== PoolType.Flex)?.available || 0) -
        (pools.active && pools.active[0].type !== PoolType.Flex ? 1 : 0) +
        pushPools,
    );
    return html` <mwc-list-item
        class="entity"
        @click=${() => character.actor.sheet.render(true)}
        graphic="medium"
        ?twoline=${!!character.sleeve}
      >
        <img slot="graphic" src=${entities.token?.texture.src ?? character.img} />
        <span>${entities.token?.name ?? character.name} </span>
        ${character.sleeve
          ? html`<span slot="secondary"
              >${formattedSleeveInfo(character.sleeve, character.vehicle).join(
                ' - ',
              )}</span
            >`
          : ''}
      </mwc-list-item>

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
            <span
              >${localize('sleight')}
              ${maxTargets === 1
                ? localize('target')
                : `${localize('targets')} (${maxTargets})`}:
              ${notEmpty(attackTargets)
                ? [...attackTargets]
                    .map((attackTarget) => attackTarget.name)
                    .join(', ')
                : '-'}</span
            >
            <sl-animated-list class="targets">
              ${repeat(game.user.targets, identity, (token) => {
                const active = attackTargets.has(token);
                return html`
                  <mwc-icon-button
                    class=${active ? 'active' : ''}
                    ?disabled=${!active && attackTargets.size === maxTargets}
                    @click=${() => {
                      const newTargets = new Set([...attackTargets]);
                      if (active) newTargets.delete(token);
                      else newTargets.add(token);
                      use.update({ attackTargets: newTargets });
                    }}
                    ><img
                      src=${token.document.texture.src || CONST.DEFAULT_TOKEN}
                  /></mwc-icon-button>
                `;
              })}
            </sl-animated-list>
          </wl-list-item>
        </section>
      </div>

      <ul class="use-info">
        <wl-list-item clickable @click=${this.selectSleight}>
          ${sleight.name}
        </wl-list-item>

        ${freePush
          ? html`
              <wl-list-item>
                <span class="free-push-label">${localize('freePush')}</span>
                <span>${localize(freePush)}</span>
              </wl-list-item>
            `
          : ''}
        <li>
          ${renderAutoForm({
            props: { push },
            update: use.update,
            fields: ({ push }) =>
              renderSelectField(push, enumValues(PsiPush), {
                emptyText: '-',
                disableOptions: test.disabledPushes,
              }),
          })}
          ${push || psi?.hasVariableInfection
            ? renderAutoForm({
                classes: 'negation-form',
                props: {
                  negation:
                    pushPools === fullSideEffectNegationPoints
                      ? 'all'
                      : pushPools === 1
                      ? 'damage'
                      : '',
                },
                update: ({ negation }) => {
                  if (!negation) use.update({ sideEffectNegation: 0 });
                  else if (negation === 'all')
                    use.update({
                      sideEffectNegation: fullSideEffectNegationPoints,
                    });
                  else if (negation === 'damage')
                    use.update({ sideEffectNegation: 1 });
                },
                fields: ({ negation }) =>
                  renderSelectField(
                    {
                      ...negation,
                      label: `${localize('negate')} ${localize('side')}
                  ${localize('effects')}
                  (${localize(test.mainPool)})`,
                    },
                    psi?.hasVariableInfection
                      ? compact([push && 'damage', 'all'])
                      : ['damage'],
                    {
                      emptyText: '-',
                      disableOptions: compact([
                        maxPsiPushPools < 1 && 'damage',
                        maxPsiPushPools < fullSideEffectNegationPoints && 'all',
                      ]),
                      altLabel: (option) =>
                        option === 'damage'
                          ? `${localize('self')} ${localize('damage')} (1)`
                          : `${
                              push
                                ? `${localize('self')} ${localize('damage')} &`
                                : ''
                            } ${localize(
                              'infectionTest',
                            )} (${fullSideEffectNegationPoints})`,
                    },
                  ),
              })
            : ''}
        </li>

        <li>
          ${renderAutoForm({
            props: {
              targetDistance,
              targetingSelf,
              targetingAsync,
              touchingTarget,
            },
            update: use.update,
            fields: ({
              targetDistance,
              touchingTarget,
              targetingSelf,
              targetingAsync,
            }) => [
              renderLabeledCheckbox(targetingSelf),
              renderLabeledCheckbox(
                maxTargets > 1
                  ? {
                      ...touchingTarget,
                      label: `${localize('touchingAllTargets')}`,
                    }
                  : touchingTarget,
                {
                  disabled: targetingSelf.value,
                  indeterminate: targetingSelf.value,
                },
              ),
              renderLabeledCheckbox(
                maxTargets > 1
                  ? {
                      ...targetingAsync,
                      label: `${localize('allTargetsAsync')}`,
                    }
                  : targetingAsync,
                {
                  disabled:
                    (targetingSelf.value && maxTargets === 1) ||
                    touchingTarget.value,
                  indeterminate:
                    (targetingSelf.value && maxTargets === 1) ||
                    touchingTarget.value,
                },
              ),
              html`<div style="display: flex; align-items: center">
                ${renderNumberField(targetDistance, {
                  min: 0,
                  step: 0.1,
                  disabled: touchingTarget.value,
                })}
                <mwc-icon
                  data-ep-tooltip="Target distance is measured in a straight line from center to center of tokens and takes into account differences in elevation. When targeting square tokens greater than 1x1 grid units, the target distance is lowered by their width/2. Token image scale is always ignored. If multiple tokens are targeted, the farthest away will be used."
                  @mouseover=${tooltip.fromData}
                  >info</mwc-icon
                >
              </div>`,
            ],
          })}
        </li>
        <wl-list-item class="info-group">
          <sl-group label="${localize('max')} ${localize('targets')}"
            >${maxTargets}</sl-group
          >
        </wl-list-item>
        ${psi?.hasVariableInfection
          ? html`
              <wl-list-item class="info-group">
                <sl-group label=${localize('infectionMod')}>
                  ${sleight.infectionMod * (push ? 2 : 1)}
                </sl-group>
              </wl-list-item>
            `
          : ''}
      </ul>
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
