import { enumValues } from '@src/data-enums';
import { PoolItem } from '@src/features/components/pool-item/pool-item';
import { conditionIcons } from '@src/features/conditions';
import type { ReadonlyPool } from '@src/features/pool';
import { poolActionOptions } from '@src/features/pools';
import { localize } from '@src/foundry/localization';
import { openMenu } from '@src/open-menu';
import { notEmpty } from '@src/utility/helpers';
import { customElement, html } from 'lit-element';
import { nothing } from 'lit-html';
import { classMap } from 'lit-html/directives/class-map';
import { CharacterDrawerRenderer } from './character-drawer-render-event';
import { CharacterViewBase, ItemGroup } from './character-view-base';
import styles from './character-view.scss';

@customElement('character-view')
export class CharacterView extends CharacterViewBase {
  static get is() {
    return 'character-view' as const;
  }

  static styles = [styles];

  private toggleNetworkSettings() {
    this.toggleDrawerRenderer(CharacterDrawerRenderer.NetworkSettings);
  }

  private viewConditions() {
    this.toggleDrawerRenderer(CharacterDrawerRenderer.Conditions);
  }

  private openPoolMenu(ev: MouseEvent) {
    if (ev.currentTarget instanceof PoolItem) {
      const { type } = ev.currentTarget.pool
      openMenu({
        header: { heading: localize(type) },
        content: poolActionOptions(this.character, type),
        position: ev
      })
    }
  
  }

  render() {
    const { masterDevice } = this.character.equippedGroups;
    const { sleights, psi, conditions, pools } = this.character;

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
                  ?disabled=${this.character.disabled}
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
          <sl-header heading=${localize("status")}></sl-header>
         <div> <div class="conditions">
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

          ${notEmpty(pools)
            ? html`
                <ul class="pools">
                  ${[...pools.values()].map(this.renderPool)}
                </ul>
              `
            : ''}</div>
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
        ${psi
          ? html`
              <section>
                <sl-header heading=${localize('psi')}></sl-header>
              </section>
            `
          : ''}
        ${psi || notEmpty(sleights)
          ? html`
              <section>
                <sl-header
                  heading=${localize('sleights')}
                  itemCount=${sleights.length}
                ></sl-header>
              </section>
            `
          : ''}
        <section>
          <sl-header heading=${localize('attacks')}></sl-header>
        </section>
        ${enumValues(ItemGroup).map(this.renderItemGroup)}
      </div>
    `;
  }

  private renderItemGroup = (group: ItemGroup) => {
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
