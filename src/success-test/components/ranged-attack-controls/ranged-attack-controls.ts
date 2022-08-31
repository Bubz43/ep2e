import {
  renderNumberField,
  renderNumberInput,
  renderRadio,
  renderRadioFields,
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
  FirearmAmmoModifierType,
  SprayPayload,
} from '@src/data-enums';
import type { ActorEP, MaybeToken } from '@src/entities/actor/actor';
import { formattedSleeveInfo } from '@src/entities/actor/sleeves';
import { ActorType, ItemType } from '@src/entities/entity-types';
import type { Explosive } from '@src/entities/item/proxies/explosive';
import {
  createExplosiveTriggerSetting,
  ExplosiveSettings,
} from '@src/entities/weapon-settings';
import {
  canAim,
  createFiringModeGroup,
  FiringMode,
  firingModeCost,
  getFiringModeGroupShots,
  MultiAmmoOption,
  multiAmmoValues,
} from '@src/features/firing-modes';
import { CommonInterval } from '@src/features/time';
import { readyCanvas } from '@src/foundry/canvas';
import { localize } from '@src/foundry/localization';
import { joinLabeledFormulas } from '@src/foundry/rolls';
import { overlay, tooltip } from '@src/init';
import { openMenu } from '@src/open-menu';
import {
  RangedAttackTest,
  RangedAttackTestInit,
} from '@src/success-test/ranged-attack-test';
import { notEmpty } from '@src/utility/helpers';
import { customElement, html, LitElement, query, state } from 'lit-element';
import { repeat } from 'lit-html/directives/repeat';
import { take } from 'remeda';
import { identity, Subscription } from 'rxjs';
import { traverseActiveElements } from 'weightless';
import styles from './ranged-attack-controls.scss';

type Init = {
  entities: {
    actor: ActorEP;
    token?: MaybeToken;
  };
  getState: (actor: ActorEP) => RangedAttackTestInit | null;
  adjacentElement?: HTMLElement;
};

@customElement('ranged-attack-controls')
export class RangedAttackControls extends LitElement {
  static get is() {
    return 'ranged-attack-controls' as const;
  }

  static get styles() {
    return [styles];
  }

  private static readonly openWindows = new WeakMap<
    ActorEP,
    RangedAttackControls
  >();

  static openWindow(init: Init) {
    (
      RangedAttackControls.openWindows.get(init.entities.actor) ||
      new RangedAttackControls()
    ).setState(init);
  }

  @query('sl-window')
  private win?: SlWindow;

  private subs = new Set<Subscription | Subscription['unsubscribe']>();

  @state() private test?: RangedAttackTest;

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
    const { targets } = game.user;
    this.test?.firing.update({
      attackTargets: new Set(
        take([...targets], this.test?.firing.maxTargets || 1),
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
    this.unsub();
    this.subs.add(() =>
      RangedAttackControls.openWindows.delete(init.entities.actor),
    );
    this.subs.add(
      init.entities.actor.subscribe((actor) => {
        const info = actor && init.getState(actor);
        if (!info) this.win?.close();
        else {
          this.subs.add(
            new RangedAttackTest(info).subscribe({
              next: (test) => (this.test = test),
              complete: () => this.win?.close(),
            }),
          );
        }
      }),
    );
    if (!this.isConnected) overlay.append(this);
    RangedAttackControls.openWindows.set(init.entities.actor, this);
    const source = init.adjacentElement || traverseActiveElements();
    if (source instanceof HTMLElement && source.isConnected) {
      await this.win?.updateComplete;
      this.win?.positionAdjacentToElement(source);
    }
  }

  private selectWeapon() {
    if (!this.test) return;

    openMenu({
      header: { heading: localize('ranged') },
      content: this.test.character.weapons.ranged.map((weapon) => ({
        label: weapon.fullName,
        sublabel: weapon.fullType,
        activated: weapon === this.test?.firing.weapon,
        callback: () => this.test?.firing.update({ weapon }),
        disabled: !weapon.canFire,
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
          callback: () => this.test?.firing.update({ calledShot: null }),
        },
        ...enumValues(CalledShot).map((shot) => ({
          label: localize(shot),
          activated: shot === this.test?.firing.calledShot,
          callback: () => this.test?.firing.update({ calledShot: shot }),
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
        name="${localize('rangedAttack')} ${localize('test')}"
        @sl-window-closed=${this.remove}
        noremove
      >
        ${this.test
          ? html`<div class="controls">${this.renderTest(this.test)}</div>`
          : ''}
      </sl-window>
    `;
  }

  private renderTest(test: NonNullable<RangedAttackControls['test']>) {
    const {
      character,
      ego,
      token,
      action,
      pools,
      target,
      firing,
      skillState,
      damageModifiers,
      attack,
      canCallShot,
    } = test;

    const {
      weapon,
      primaryAttack,
      attackTargets,
      targetDistance,
      range,
      calledShot,
      explosiveSettings,
      oneHanded,
      maxTargets,
      seekerMode,
      firingModeGroup,
      quickAim,
    } = firing;
    const { attacks, isTwoHanded, noClose, noPointBlank } = weapon ?? {};
    // TODO noClose/NoPointBlank

    const [specialAmmo, mode] =
      attack && 'specialAmmo' in attack ? attack.specialAmmo ?? [] : [];

    const { damageModifierType, damageFormula: ammoFormula } = mode ?? {};

    const attackFormulas = [...(attack?.rollFormulas || [])];
    if (
      damageModifierType === FirearmAmmoModifierType.Formula &&
      specialAmmo &&
      mode
    ) {
      attackFormulas.push({
        label: `${specialAmmo.name} ${
          specialAmmo.hasMultipleModes ? `(${mode.name})` : ''
        }`,
        formula: ammoFormula || '+0',
      });
    }
    const formula =
      damageModifierType === FirearmAmmoModifierType.Halve
        ? `(${joinLabeledFormulas(attackFormulas)}) / 2`
        : joinLabeledFormulas(attackFormulas);

    const joinedFormula =
      attack?.rollFormulas.length &&
      damageModifierType !== FirearmAmmoModifierType.NoDamage
        ? joinLabeledFormulas([
            {
              label: localize('attack'),
              formula,
            },
            ...damageModifiers,
          ])
        : null;

    return html`
      ${character
        ? html`
            <mwc-list-item
              class="entity"
              @click=${() => character.actor.sheet.render(true)}
              graphic="medium"
              ?twoline=${!!character.sleeve}
            >
              <img slot="graphic" src=${token?.img ?? character.img} />
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
            <span
              >${localize('attack')}
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
                      firing.update({ attackTargets: newTargets });
                    }}
                    ><img src=${token.document.img || CONST.DEFAULT_TOKEN}
                  /></mwc-icon-button>
                `;
              })}
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

      <ul class="firing-info">
        <wl-list-item clickable @click=${this.selectWeapon}>
          ${weapon.name}
        </wl-list-item>
        ${attacks?.secondary
          ? html`
              <wl-list-item
                class="attack-setting"
                clickable
                @click=${() => firing.update({ primaryAttack: !primaryAttack })}
              >
                ${attack?.label}
              </wl-list-item>
            `
          : ''}
        ${this.renderFiringModeSelect(test)}
        ${weapon.type === ItemType.SeekerWeapon &&
        weapon.missiles &&
        explosiveSettings // TODO Spray Weapon
          ? html`
              ${renderAutoForm({
                props: { seekerMode },
                update: firing.update,
                fields: ({ seekerMode }) =>
                  renderRadioFields(seekerMode, ['accushot', 'homing']),
              })}
              ${weapon.missiles.areaEffect
                ? this.renderAreaEffectEdit(
                    weapon.missiles,
                    explosiveSettings,
                    weapon.missiles.areaEffect,
                  )
                : ''}
              ${this.renderTriggerSettings(explosiveSettings)}
            `
          : ''}
        ${canAim(firingModeGroup)
          ? html`
              <mwc-check-list-item
                ?selected=${quickAim}
                @click=${() => firing.update({ quickAim: !quickAim })}
                >${localize('quick')} ${localize('aim')} (${localize('quick')}
                ${localize('action')})</mwc-check-list-item
              >
            `
          : ''}
        ${isTwoHanded
          ? html`
              <mwc-check-list-item
                ?selected=${!oneHanded}
                @click=${() => firing.update({ oneHanded: !oneHanded })}
              >
                <span>${localize('twoHanded')}</span>
              </mwc-check-list-item>
            `
          : ''}

        <li>
          ${renderAutoForm({
            props: { targetDistance, range },
            update: firing.update,
            fields: ({ targetDistance, range }) => [
              html`<div style="display: flex; align-items: center">
                ${renderNumberField(targetDistance, { min: 0, step: 0.1 })}
                <mwc-icon
                  data-tooltip="Target distance is measured in a straight line from center to center of tokens and takes into account differences in elevation. When targeting square tokens greater than 1x1 grid units, the target distance is lowered by their width/2. Token image scale is always ignored. If multiple tokens are targeted, the farthest away will be used."
                  @mouseover=${tooltip.fromData}
                  >info</mwc-icon
                >
              </div>`,
              renderNumberField(
                { ...range, label: `${localize('weaponRange')}` },
                {
                  min: 1,
                  step: 0.1,
                  helpPersistent: range.value === Infinity,
                  helpText:
                    range.value === Infinity
                      ? range.value.toString()
                      : undefined,
                },
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
        <wl-list-item class="damage-value">
          ${joinedFormula || localize('noDamage')}
        </wl-list-item>
        ${weapon.type === ItemType.SprayWeapon &&
        weapon.payloadUse === SprayPayload.CoatAmmunition &&
        weapon.payload &&
        !weapon.shouldApplyCoating(getFiringModeGroupShots(firingModeGroup))
          ? html`
              <wl-list-item
                >${localize('ammoCoating')} ${localize('not')}
                ${localize('applied')}</wl-list-item
              >
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

  private renderFiringModeSelect(
    test: NonNullable<RangedAttackControls['test']>,
  ) {
    const { weapon, firingModeGroup } = test.firing;
    const { attack } = test;
    if (weapon.type === ItemType.SeekerWeapon) {
      return html`<mwc-formfield label=${localize(weapon.firingMode)}
        >${renderRadio({
          checked: true,
          name: weapon.firingMode,
          value: weapon.firingMode,
          disabled: false,
        })}</mwc-formfield
      >`;
    }
    if (!attack || !('firingModes' in attack)) return '';

    return html`
      ${renderAutoForm({
        props: { firingMode: firingModeGroup[0] },
        update: ({ firingMode }) =>
          firingMode &&
          test.firing.update({
            firingModeGroup: createFiringModeGroup(firingMode),
          }),
        fields: ({ firingMode }) => [
          html`<div class="firing-modes">
            ${attack.firingModes.map(
              (mode) =>
                html`<mwc-formfield label=${localize('SHORT', mode)}
                  >${renderRadio({
                    checked: mode === firingMode.value,
                    name: firingMode.prop,
                    value: mode,
                    disabled: firingModeCost[mode] > weapon.availableShots,
                  })}</mwc-formfield
                >`,
            )}
          </div>`,
        ],
      })}
      ${firingModeGroup[0] === FiringMode.BurstFire
        ? html`
            <mwc-list class="ammo-modes">
              ${enumValues(MultiAmmoOption).map((mode) => {
                const value = multiAmmoValues[firingModeGroup[0]][mode];
                return html`
                  <mwc-radio-list-item
                    left
                    ?selected=${mode === firingModeGroup[1]}
                    @click=${() =>
                      test.firing.update({
                        firingModeGroup: [firingModeGroup[0], mode],
                      })}
                    ?disabled=${mode === MultiAmmoOption.ConcentratedDamage &&
                    attack.rollFormulas.length === 0}
                  >
                    ${mode === MultiAmmoOption.AdjacentTargets
                      ? `${value} ${localize(mode)}`
                      : mode === MultiAmmoOption.ConcentratedDamage
                      ? value
                      : `+${value} ${localize('toHit')}`}
                  </mwc-radio-list-item>
                `;
              })}
            </mwc-list>
          `
        : firingModeGroup[0] === FiringMode.FullAuto
        ? html`
            <mwc-list class="ammo-modes">
              ${enumValues(MultiAmmoOption).map((mode) => {
                const value = multiAmmoValues[firingModeGroup[0]][mode];

                return html`
                  <mwc-radio-list-item
                    left
                    ?selected=${mode === firingModeGroup[1]}
                    @click=${() =>
                      test.firing.update({
                        firingModeGroup: [firingModeGroup[0], mode],
                      })}
                  >
                    ${mode === MultiAmmoOption.AdjacentTargets
                      ? `${value} ${localize(mode)}`
                      : mode === MultiAmmoOption.ConcentratedDamage
                      ? value
                      : `+${value} ${localize('toHit')}`}
                  </mwc-radio-list-item>
                `;
              })}
              <mwc-radio-list-item
                left
                ?disabled=${weapon.availableShots <
                firingModeCost.suppressiveFire}
                ?selected=${firingModeGroup[1] === 'suppressiveFire'}
                @click=${() =>
                  test.firing.update({
                    firingModeGroup: [firingModeGroup[0], 'suppressiveFire'],
                  })}
              >
                ${localize('suppressiveFire')}
              </mwc-radio-list-item>
            </mwc-list>
          `
        : ''}
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
                this.test?.firing.update({
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
              classes: 'blast-radius-form',
              props: {
                uniformBlastRadius:
                  settings.uniformBlastRadius || explosive.areaEffectRadius,
              },
              update: (changed) => {
                this.test?.firing.update({
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
            this.test?.firing.update({
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
            this.test?.firing.update({
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
            this.test?.firing.update({
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
            this.test?.firing.update({
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
    'ranged-attack-controls': RangedAttackControls;
  }
}
