import { renderLabeledCheckbox } from '@src/components/field/fields';
import { renderAutoForm } from '@src/components/form/forms';
import { enumValues } from '@src/data-enums';
import { morphAcquisitionDetails } from '@src/entities/components/sleeve-acquisition';
import { ItemType } from '@src/entities/entity-types';
import {
  Substance,
  SubstanceUseMethod,
} from '@src/entities/item/proxies/substance';
import { PoolItem } from '@src/features/components/pool-item/pool-item';
import { conditionIcons, ConditionType } from '@src/features/conditions';
import { idProp, matchID } from '@src/features/feature-helpers';
import type { ReadonlyPool } from '@src/features/pool';
import { poolActionOptions } from '@src/features/pools';
import { prettyMilliseconds } from '@src/features/time';
import {
  DropType,
  handleDrop,
  itemDropToItemProxy,
} from '@src/foundry/drag-and-drop';
import { localize } from '@src/foundry/localization';
import { tooltip } from '@src/init';
import { RenderDialogEvent } from '@src/open-dialog';
import { openMenu } from '@src/open-menu';
import { notEmpty } from '@src/utility/helpers';
import { customElement, html, internalProperty } from 'lit-element';
import { nothing, TemplateResult } from 'lit-html';
import { cache } from 'lit-html/directives/cache';
import { classMap } from 'lit-html/directives/class-map';
import { repeat } from 'lit-html/directives/repeat';
import { compact, identity } from 'remeda';
import { traverseActiveElements } from 'weightless';
import { CharacterDrawerRenderer } from './character-drawer-render-event';
import { CharacterViewBase, ItemGroup } from './character-view-base';
import styles from './character-view.scss';
import { substanceActivationDialog } from './components/substance-activation-dialog';

type Detail = {
  label: string;
  value: string | number;
};

@customElement('character-view')
export class CharacterView extends CharacterViewBase {
  static get is() {
    return 'character-view' as const;
  }

  static styles = [styles];

  @internalProperty() private dialogTemplate: TemplateResult | null = null;

  @internalProperty() private viewDetails = false;

  firstUpdated() {
    this.addEventListener(RenderDialogEvent.is, async (ev) => {
      ev.stopPropagation();
      this.dialogTemplate = ev.dialogTemplate;
      const focusSource = traverseActiveElements();
      await this.updateComplete;
      requestAnimationFrame(() => {
        const dialog = this.renderRoot.querySelector('mwc-dialog');
        if (!dialog) this.dialogTemplate = null;
        else {
          if (!dialog.open) dialog.open = true;
          const checkGlobal = (ev: Event) => {
            if (!ev.composedPath().includes(this)) {
              dialog.open = false;
            }
          };
          window.addEventListener('mousedown', checkGlobal);
          dialog.addEventListener(
            'closed',
            () => {
              const newFocus = traverseActiveElements();
              if (
                !newFocus &&
                focusSource?.isConnected &&
                focusSource instanceof HTMLElement
              ) {
                focusSource.focus();
              }
              this.dialogTemplate = null;
              window.removeEventListener('mousedown', checkGlobal);
            },
            { once: true },
          );
        }
      });
    });
    super.firstUpdated();
  }

  private setTab(ev: CustomEvent<{ index: number }>) {
    this.viewDetails = ev.detail.index === 1;
  }

  private toggleNetworkSettings() {
    this.toggleDrawerRenderer(CharacterDrawerRenderer.NetworkSettings);
  }

  private viewConditions() {
    this.toggleDrawerRenderer(CharacterDrawerRenderer.Conditions);
  }

  private viewResleeve() {
    this.toggleDrawerRenderer(CharacterDrawerRenderer.Resleeve);
  }

  private openPoolMenu(ev: MouseEvent) {
    if (ev.currentTarget instanceof PoolItem) {
      const { type } = ev.currentTarget.pool;
      openMenu({
        header: { heading: localize(type) },
        content: poolActionOptions(this.character, type),
        position: ev,
      });
    }
  }

  private applyDroppedSubstance = handleDrop(async ({ ev, data }) => {
    if (data?.type === DropType.Item && !this.character.disabled) {
      const item = await itemDropToItemProxy(data);
      if (item?.type !== ItemType.Substance || !item.quantity) return;
      let isHidden = false;

      const addSubstance = async (method: SubstanceUseMethod) => {
        const [id] = await this.character.itemOperations.add(
          item.createAwaitingOnset({ method }),
        );
        if (item.actor && item.editable) await item.use();

        await this.updateComplete;
        setTimeout(() => {
          if (Substance.onsetTime(method) === 0 && id) {
            this.openSubstanceActivationDialog(id);
          }
        }, 1);
      };
      if (
        item.applicationMethods.length === 1 &&
        this.character.hasItemProxy(item)
      ) {
        addSubstance(item.applicationMethods[0]!);
      } else {
        openMenu({
          header: { heading: `${localize('apply')} ${item.name}` },
          content: [
            renderAutoForm({
              props: { hidden: isHidden },
              update: ({ hidden = false }) => (isHidden = hidden),
              fields: ({ hidden }) => renderLabeledCheckbox(hidden),
            }),
            'divider',
            ...item.applicationMethods.map((method) => ({
              label: `${localize(method)} - ${localize(
                'onset',
              )}: ${prettyMilliseconds(Substance.onsetTime(method))}`,
              callback: () => addSubstance(method),
            })),
          ],
          position: ev,
        });
      }
    }
  });

  private openSubstanceActivationDialog(id: string) {
    const substance = this.character.awaitingOnsetSubstances.find(matchID(id));
    console.log(substance);
    if (!substance) return;
    if (
      notEmpty(
        Object.values(this.character.appliedEffects.substanceModifiers).flat(),
      )
    ) {
      this.dispatchEvent(
        new RenderDialogEvent(
          substanceActivationDialog(this.character, substance),
        ),
      );
    } else substance.makeActive([]);
  }

  private toggleCondition(ev: Event) {
    if (ev.currentTarget instanceof HTMLElement) {
      const { condition } = ev.currentTarget.dataset;
      condition && this.character.toggleCondition(condition as ConditionType);
    }
  }

  render() {
    const { masterDevice } = this.character.equippedGroups;
    const {
      awaitingOnsetSubstances,
      activeSubstances,
      psi,
      conditions,
      pools,
      disabled,
      temporaryConditionSources,
    } = this.character;

    return html`
      <character-view-header
        .character=${this.character}
        .token=${this.token}
      ></character-view-header>

      <div class="side">
        <character-view-ego
          .character=${this.character}
          .ego=${this.character.ego}
        ></character-view-ego>

        ${psi
          ? html`
              <character-view-psi
                .character=${this.character}
                .psi=${psi}
              ></character-view-psi>
            `
          : ''}
        ${this.character.sleeve
          ? html`
              <character-view-sleeve
                .character=${this.character}
                .sleeve=${this.character.sleeve}
                .token=${this.token}
              ></character-view-sleeve>
            `
          : html`
              <div class="sleeve-select">
                <mwc-button
                  raised
                  ?disabled=${disabled}
                  label="${localize('select')} ${localize('sleeve')}"
                  @click=${this.viewResleeve}
                ></mwc-button>
              </div>
            `}

        <character-view-test-actions
          .character=${this.character}
          .ego=${this.character.ego}
        ></character-view-test-actions>
      </div>
      ${this.renderDrawer()}

      <mwc-tab-bar @MDCTabBar:activated=${this.setTab}>
        <mwc-tab minWidth label=${localize('overview')}></mwc-tab>
        <mwc-tab minWidth label=${localize('details')}></mwc-tab>
      </mwc-tab-bar>

      <div class="sections">
        ${cache(
          this.viewDetails ? this.renderDetails() : this.renderOverview(),
        )}
      </div>

      ${this.dialogTemplate || ''}
    `;
  }

  private renderOverview() {
    const { masterDevice } = this.character.equippedGroups;
    const {
      awaitingOnsetSubstances,
      activeSubstances,
      psi,
      conditions,
      pools,
      disabled,
      temporaryConditionSources,
    } = this.character;
    return html`
      <section class="status">
        <sl-header heading=${localize('status')}></sl-header>
        <div class="status-items">
          <div class="conditions">
            <mwc-button
              class="conditions-toggle"
              @click=${this.viewConditions}
              dense
              >${localize('conditions')}</mwc-button
            >
            <div class="conditions-list">
              ${enumValues(ConditionType).map(
                (condition) => html`
                  <button
                    ?disabled=${disabled}
                    data-condition=${condition}
                    @click=${this.toggleCondition}
                    data-tooltip=${localize(condition)}
                    @mouseover=${tooltip.fromData}
                  >
                    <img
                      src=${conditionIcons[condition]}
                      class=${conditions.includes(condition) ? 'active' : ''}
                      height="22px"
                    />
                    ${temporaryConditionSources.has(condition)
                      ? html`<notification-coin
                          value=${temporaryConditionSources.get(condition)
                            ?.length || 1}
                        ></notification-coin>`
                      : ''}
                  </button>
                `,
              )}
            </div>
          </div>

          <sl-dropzone
            class="applied-substances"
            ?disabled=${disabled}
            @drop=${this.applyDroppedSubstance}
          >
            ${activeSubstances.length + awaitingOnsetSubstances.length === 0
              ? html`
                  <p class="no-substances-message">
                    ${localize('no')} ${localize('applied')}
                    ${localize('substances')}.
                  </p>
                `
              : html`
                  ${notEmpty(activeSubstances)
                    ? html`
                        <sl-details
                          open
                          summary="${localize('active')} ${localize(
                            'substances',
                          )} (${activeSubstances.length})"
                        >
                          <sl-animated-list class="active-substances">
                            ${repeat(
                              activeSubstances,
                              idProp,
                              (substance) => html`
                                <character-view-active-substance
                                  .substance=${substance}
                                  .character=${this.character}
                                ></character-view-active-substance>
                              `,
                            )}
                          </sl-animated-list>
                        </sl-details>
                      `
                    : ''}
                  ${notEmpty(awaitingOnsetSubstances)
                    ? html`
                        <sl-details
                          open
                          summary="${localize(
                            'substancesAwaitingOnset',
                          )} (${awaitingOnsetSubstances.length})"
                        >
                          <sl-animated-list>
                            ${repeat(
                              awaitingOnsetSubstances,
                              idProp,
                              (substance) => html`
                                <time-state-item
                                  ?disabled=${disabled}
                                  .timeState=${substance.awaitingOnsetTimeState}
                                  completion="ready"
                                  .item=${substance}
                                >
                                  <mwc-icon-button
                                    slot="action"
                                    icon="play_arrow"
                                    data-tooltip=${localize('start')}
                                    @mouseover=${tooltip.fromData}
                                    @click=${() => {
                                      this.openSubstanceActivationDialog(
                                        substance.id,
                                      );
                                    }}
                                  ></mwc-icon-button>
                                </time-state-item>
                              `,
                            )}
                          </sl-animated-list></sl-details
                        >
                      `
                    : ''}
                `}
          </sl-dropzone>

          ${notEmpty(pools)
            ? html`
                <ul class="pools">
                  ${[...pools.values()].map(this.renderPool)}
                </ul>
              `
            : ''}
        </div>
      </section>
      <!-- <section>
    <sl-header heading=${localize('network')}>
      <mwc-icon-button
        slot="action"
        icon="settings"
        @click=${this.toggleNetworkSettings}
      ></mwc-icon-button>
    </sl-header>
    <div class="network">
      <sl-group label=${localize('masterDevice')}
        >${masterDevice?.fullName ?? '-'}</sl-group
      >
    </div>
    ${masterDevice
        ? html`
            <health-item clickable .health=${masterDevice.meshHealth}>
              <span slot="source">${localize('meshHealth')} </span>
            </health-item>
            <health-item
              clickable
              .health=${masterDevice.firewallHealth}
            ></health-item>
          `
        : ''}
  </section> -->

      <section>
        <sl-header heading=${localize('attacks')}></sl-header>
        <ul class="attacks">
          ${repeat(
            this.character.weapons.melee,
            idProp,
            (weapon) => html`
              <li>
                <header>
                  ${weapon.name} <span class="type">${weapon.fullType}</span>
                </header>
                <character-view-melee-weapon-attacks
                  .weapon=${weapon}
                ></character-view-melee-weapon-attacks>
              </li>
            `,
          )}
          ${repeat(
            this.character.weapons.explosives,
            idProp,
            (explosive) => html`
              <li>
                <header>
                  ${explosive.fullName}
                  <span class="type">${explosive.fullType}</span>
                </header>
                <character-view-explosive-attacks
                  .explosive=${explosive}
                ></character-view-explosive-attacks>
              </li>
            `,
          )}
        </ul>
      </section>

      ${repeat(enumValues(ItemGroup), identity, this.renderItemGroup)}
    `;
  }

  private renderDetails() {
    const { ego, sleeve, psi } = this.character;
    // TODO sleeve details, sex, limbs, reach, acquisition
    const sleeveDetails: Detail[] | null | undefined =
      sleeve &&
      compact([
        ...morphAcquisitionDetails(sleeve.acquisition),
        'prehensileLimbs' in sleeve && {
          label: localize('prehensileLimbs'),
          value: sleeve.prehensileLimbs,
        },
      ]);
    return html`
      <sl-details open summary="${localize('ego')} - ${ego.name}">
        ${notEmpty(ego.details)
          ? html`
              <div class="details">${ego.details.map(this.renderDetail)}</div>
            `
          : ''}
        ${ego.description
          ? html` <enriched-html .content=${ego.description}></enriched-html> `
          : ''}
      </sl-details>

      ${psi
        ? html`
            <sl-details open summary="${localize('psi')} - ${psi.name}">
              ${psi.description
                ? html`
                    <enriched-html .content=${psi.description}></enriched-html>
                  `
                : ''}
            </sl-details>
          `
        : ''}
      ${sleeve
        ? html`
            <sl-details open summary="${localize('sleeve')} - ${sleeve.name}">
              ${notEmpty(sleeveDetails)
                ? html`
                    <div class="details">
                      ${sleeveDetails.map(this.renderDetail)}
                    </div>
                  `
                : ''}
              ${sleeve.description
                ? html`
                    <enriched-html
                      .content=${sleeve.description}
                    ></enriched-html>
                  `
                : ''}
            </sl-details>
          `
        : ''}
    `;
  }

  private renderDetail = ({ label, value }: Detail) => html` <span
    class="detail"
    >${label} <span class="value">${value}</span></span
  >`;

  private renderItemGroup = (group: ItemGroup) => {
    if (
      group === ItemGroup.Sleights &&
      !this.character.psi &&
      !this.character.sleights.length
    )
      return '';
    return html`
      <character-view-item-group
        .character=${this.character}
        group=${group}
        ?collapsed=${group === ItemGroup.Stashed}
      ></character-view-item-group>
    `;
  };

  protected renderDrawer() {
    const { drawerIsOpen } = this;
    return html`
      <focus-trap class="drawer ${classMap({ open: drawerIsOpen })}">
        ${drawerIsOpen
          ? html`
              ${this.renderDrawerContent()}
              <wl-list-item
                role="button"
                class="close-drawer"
                clickable
                @click=${this.closeDrawer}
                ><mwc-icon>close</mwc-icon></wl-list-item
              >
            `
          : nothing}
      </focus-trap>
    `;
  }

  private renderPool = (pool: ReadonlyPool) => html`
    <pool-item
      @click=${this.openPoolMenu}
      .pool=${pool}
      ?disabled=${this.character.disabled}
      ?wide=${this.character.pools.size <= 2}
    ></pool-item>
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    'character-view': CharacterView;
  }
}
