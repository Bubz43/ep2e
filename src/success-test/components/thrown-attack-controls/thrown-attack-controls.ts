import {
  renderNumberField,
  renderNumberInput,
  renderSelectField,
  renderTimeField,
} from '@src/components/field/fields';
import { renderAutoForm } from '@src/components/form/forms';
import type { SlWindow } from '@src/components/window/window';
import {
  AreaEffectType,
  CalledShot,
  enumValues,
  ExplosiveTrigger,
} from '@src/data-enums';
import type { ActorEP, MaybeToken } from '@src/entities/actor/actor';
import { formattedSleeveInfo } from '@src/entities/actor/sleeves';
import { ActorType, ItemType } from '@src/entities/entity-types';
import type { Explosive } from '@src/entities/item/proxies/explosive';
import {
  createExplosiveTriggerSetting,
  ExplosiveSettings,
} from '@src/entities/weapon-settings';
import { CommonInterval } from '@src/features/time';
import { readyCanvas } from '@src/foundry/canvas';
import { localize } from '@src/foundry/localization';
import { joinLabeledFormulas } from '@src/foundry/rolls';
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

    openMenu({
      header: { heading: localize('throw') },
      content: this.test.character.weapons.thrown.map((weapon) => ({
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
        name="${localize('thrownAttack')} ${localize('test')}"
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
      damageFormulas,
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
      oneHanded,
    } = throwing;
    const { morphSize } = character;
    const { attacks } = weapon ?? {};

    const joinedFormula = joinLabeledFormulas(damageFormulas);

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
                    @click=${() => throwing.update({ attackTarget: token })}
                    ><img src=${token.data.img}
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

      <ul class="throwing-info">
        <wl-list-item clickable @click=${this.selectWeapon}>
          ${weapon.name}
        </wl-list-item>
        ${attacks?.secondary
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
        ${weapon.type === ItemType.Explosive && explosiveSettings
          ? html`
              ${weapon.areaEffect
                ? this.renderAreaEffectEdit(
                    weapon,
                    explosiveSettings,
                    weapon.areaEffect,
                  )
                : ''}
              ${this.renderTriggerSettings(explosiveSettings)}
            `
          : ''}
        ${weapon.type === ItemType.ThrownWeapon && weapon.isTwoHanded
          ? html`
              <mwc-check-list-item
                ?selected=${!oneHanded}
                @click=${() => throwing.update({ oneHanded: !oneHanded })}
              >
                <span>${localize('twoHanded')}</span>
              </mwc-check-list-item>
            `
          : ''}

        <li>
          ${renderAutoForm({
            props: { targetDistance, range },
            update: throwing.update,
            fields: ({ targetDistance, range }) => [
              renderNumberField(targetDistance, { min: 0 }),
              renderNumberField(
                { ...range, label: `${localize('throwingRange')}` },
                { min: 1 },
              ),
            ],
          })}
        </li>
        ${canCallShot
          ? html`
              <wl-list-item clickable @click=${this.selectCalledShot}>
                <span>${localize('calledShot')}</span>
                <span slot="after"
                  >${calledShot ? localize(calledShot) : '-'}</span
                >
              </wl-list-item>
            `
          : ''}
        ${weapon.type === ItemType.ThrownWeapon
          ? html`
              <wl-list-item>
                <span class="damage-value"
                  >${localize('SHORT', 'damageValue')}: ${joinedFormula}</span
                >
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

  private renderAreaEffectEdit(
    explosive: Explosive,
    settings: ExplosiveSettings,
    areaEffect: AreaEffectType,
  ) {
    return html`<li class="area-effect">
      <span
        >${localize(areaEffect)} ${localize('areaEffect')}
        ${areaEffect === AreaEffectType.Centered
          ? renderAutoForm({
              storeOnInput: true,

              props: {
                centeredReduction: settings.centeredReduction || -2,
              },
              update: (changed) => {
                this.test?.throwing.update({
                  explosiveSettings: { ...settings, ...changed },
                });
              },
              fields: ({ centeredReduction }) =>
                html`${renderNumberInput(centeredReduction, {
                  max: -2,
                  min: -20,
                })}
                DV/m`,
            })
          : renderAutoForm({
              storeOnInput: true,
              props: {
                uniformBlastRadius:
                  settings.uniformBlastRadius || explosive.areaEffectRadius,
              },
              update: (changed) => {
                this.test?.throwing.update({
                  explosiveSettings: { ...settings, ...changed },
                });
              },
              fields: ({ uniformBlastRadius }) =>
                html`${renderNumberInput(uniformBlastRadius, {
                  min: 1,
                  max: explosive.areaEffectRadius,
                })}
                ${localize('meter')} ${localize('radius')}`,
            })}
      </span>
      <p>
        ${localize('quick')} ${localize('action')} ${localize('to')}
        ${localize('adjust')}
      </p>
    </li>`;
  }

  private renderTriggerSettings(settings: ExplosiveSettings) {
    return html` <li class="trigger">
      ${renderAutoForm({
        props: settings.trigger,
        update: ({ type }) => {
          type &&
            this.test?.throwing.update({
              explosiveSettings: {
                ...settings,
                trigger: createExplosiveTriggerSetting(type),
              },
            });
        },
        fields: ({ type }) =>
          renderSelectField(
            { ...type, label: localize('trigger') },
            enumValues(ExplosiveTrigger),
          ),
      })}
      ${this.renderTriggerForm(settings)}
    </li>`;
  }

  private renderTriggerForm(settings: ExplosiveSettings) {
    const { trigger } = settings;
    switch (trigger.type) {
      case ExplosiveTrigger.Impact:
      case ExplosiveTrigger.Signal:
        return '';

      case ExplosiveTrigger.Airburst:
        return renderAutoForm({
          props: trigger,
          update: (changed) => {
            this.test?.throwing.update({
              explosiveSettings: {
                ...settings,
                trigger: { ...trigger, ...changed },
              },
            });
          },
          fields: ({ distance }) => renderNumberField(distance, { min: 1 }), // TODO max?
        });

      case ExplosiveTrigger.Proximity:
        return renderAutoForm({
          props: trigger,
          classes: 'proximity-form',
          update: (changed) => {
            this.test?.throwing.update({
              explosiveSettings: {
                ...settings,
                trigger: { ...trigger, ...changed },
              },
            });
          },
          fields: ({ radius, targets }) => [
            renderNumberField(
              { ...radius, label: `${radius.label} (${localize('meters')})` },
              { min: 0.1, max: 3 },
            ),
            renderSelectField(
              targets,
              [ActorType.Biological, ActorType.Synthetic],
              { emptyText: localize('any') },
            ),
          ],
        });

      case ExplosiveTrigger.Timer:
        return renderAutoForm({
          props: trigger,
          update: (changed) => {
            this.test?.throwing.update({
              explosiveSettings: {
                ...settings,
                trigger: { ...trigger, ...changed },
              },
            });
          },
          fields: ({ detonationPeriod }) =>
            renderTimeField(detonationPeriod, { min: CommonInterval.Turn }),
        });
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'thrown-attack-controls': ThrownAttackControls;
  }
}
