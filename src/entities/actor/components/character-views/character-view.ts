import { enumValues, SubstanceApplicationMethod } from '@src/data-enums';
import { ItemType } from '@src/entities/entity-types';
import {
  Substance,
  SubstanceUseMethod,
} from '@src/entities/item/proxies/substance';
import { PoolItem } from '@src/features/components/pool-item/pool-item';
import { conditionIcons } from '@src/features/conditions';
import { idProp } from '@src/features/feature-helpers';
import type { ReadonlyPool } from '@src/features/pool';
import { poolActionOptions } from '@src/features/pools';
import { prettyMilliseconds } from '@src/features/time';
import {
  DropType,
  handleDrop,
  itemDropToItemProxy,
} from '@src/foundry/drag-and-drop';
import { localize } from '@src/foundry/localization';
import { RenderDialogEvent } from '@src/open-dialog';
import { openMenu } from '@src/open-menu';
import { notEmpty } from '@src/utility/helpers';
import { customElement, html, internalProperty } from 'lit-element';
import { nothing, TemplateResult } from 'lit-html';
import { classMap } from 'lit-html/directives/class-map';
import { repeat } from 'lit-html/directives/repeat';
import { identity } from 'remeda';
import { traverseActiveElements } from 'weightless';
import { CharacterDrawerRenderer } from './character-drawer-render-event';
import { CharacterViewBase, ItemGroup } from './character-view-base';
import styles from './character-view.scss';

@customElement('character-view')
export class CharacterView extends CharacterViewBase {
  static get is() {
    return 'character-view' as const;
  }

  static styles = [styles];

  @internalProperty() private dialogTemplate: TemplateResult | null = null;

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

  private toggleNetworkSettings() {
    this.toggleDrawerRenderer(CharacterDrawerRenderer.NetworkSettings);
  }

  private viewConditions() {
    this.toggleDrawerRenderer(CharacterDrawerRenderer.Conditions);
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
      const addSubstance = async (method: SubstanceUseMethod) => {
        await this.character.itemOperations.add(
          item.createAwaitingOnset(method),
        );
        if (item.actor && item.editable) item.useUnit();
      };
      if (item.applicationMethods.length === 1)
        addSubstance(item.applicationMethods[0]!);
      else {
        openMenu({
          header: { heading: `${localize('apply')} ${item.name}` },
          content: item.applicationMethods.map((method) => ({
            label: `${localize(method)} - ${localize(
              'onset',
            )}: ${prettyMilliseconds(Substance.onsetTime(method))}`,
            callback: () => addSubstance(method),
          })),
          position: ev,
        });
      }
    }
  });

  render() {
    const { masterDevice } = this.character.equippedGroups;
    const {
      awaitingOnsetSubstances,
      activeSubstances,
      psi,
      conditions,
      pools,
      disabled,
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
        ${this.character.sleeve
          ? html`
              <character-view-sleeve
                .character=${this.character}
                .sleeve=${this.character.sleeve}
              ></character-view-sleeve>
            `
          : html`
              <div class="sleeve-select">
                <mwc-button
                  raised
                  ?disabled=${disabled}
                  label="${localize('select')} ${localize('sleeve')}"
                  @click=${() =>
                    this.toggleDrawerRenderer(CharacterDrawerRenderer.Resleeve)}
                ></mwc-button>
              </div>
            `}
      </div>
      ${this.renderDrawer()}

      <div class="sections">
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
              ${notEmpty(conditions)
                ? html`
                    ${conditions.map(
                      (condition) =>
                        html`<img
                          src=${conditionIcons[condition]}
                          title=${localize(condition)}
                          height="20px"
                        />`,
                    )}
                  `
                : html`<span>${localize('none')}</span>`}
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
                            <sl-animated-list>
                              ${repeat(
                                activeSubstances,
                                idProp,
                                (substance) => html`
                                  <wl-list-item>
                                    <span slot="before">${substance.name}</span>
                                  </wl-list-item>
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
                                  <wl-list-item>
                                    <span slot="before">${substance.name}</span>
                                  </wl-list-item>
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
        <section>
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
        </section>

        <section>
          <sl-header heading=${localize('attacks')}></sl-header>
        </section>
        ${psi
          ? html`
              <section>
                <sl-header heading=${localize('psi')}></sl-header>
              </section>
            `
          : ''}
        ${repeat(enumValues(ItemGroup), identity, this.renderItemGroup)}
      </div>

      ${this.dialogTemplate || ''}
    `;
  }

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
      ?disabled=${this.character.disabled || pool.disabled}
    ></pool-item>
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    'character-view': CharacterView;
  }
}
