import {
  emptyTextDash,
  renderLabeledCheckbox,
  renderSelectField,
} from '@src/components/field/fields';
import { renderUpdaterForm } from '@src/components/form/forms';
import { enumValues, FullDefenseType } from '@src/data-enums';
import { morphAcquisitionDetails } from '@src/entities/components/sleeve-acquisition';
import { ActorType } from '@src/entities/entity-types';
import { conditionIcons, ConditionType } from '@src/features/conditions';
import { idProp } from '@src/features/feature-helpers';
import { localize } from '@src/foundry/localization';
import { tooltip } from '@src/init';
import { RenderDialogEvent } from '@src/open-dialog';
import { notEmpty } from '@src/utility/helpers';
import { customElement, html, internalProperty } from 'lit-element';
import { nothing, TemplateResult } from 'lit-html';
import { cache } from 'lit-html/directives/cache';
import { classMap } from 'lit-html/directives/class-map';
import { repeat } from 'lit-html/directives/repeat';
import { compact, difference, identity } from 'remeda';
import { traverseActiveElements } from 'weightless';
import { CharacterDrawerRenderer } from './character-drawer-render-event';
import { CharacterViewBase, ItemGroup } from './character-view-base';
import styles from './character-view.scss';

type Detail = {
  label: string;
  value: string | number;
};

const tabs = ['actions', 'inventory', 'traits', 'details'] as const;

type CharacterTab = typeof tabs[number];

@customElement('character-view')
export class CharacterView extends CharacterViewBase {
  static get is() {
    return 'character-view' as const;
  }

  static styles = [styles];

  @internalProperty() private dialogTemplate: TemplateResult | null = null;

  @internalProperty() private currentTab: CharacterTab = 'actions';

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
    this.currentTab = tabs[ev.detail.index] ?? 'actions';
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

  render() {
    const { masterDevice } = this.character.equippedGroups;
    const {
      psi,

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
        <!-- ${this.renderStatus()} -->
      </div>

      <mwc-list class="side-panels">
        ${['search', 'time', 'resleeve', 'network', 'recharge', 'effects'].map(
          (label) => html`<mwc-list-item>${label}</mwc-list-item>`,
        )}
      </mwc-list>
      ${this.renderDrawer()}

      <mwc-tab-bar @MDCTabBar:activated=${this.setTab}>
        ${tabs.map((tab) => html` <mwc-tab label=${localize(tab)}></mwc-tab> `)}
      </mwc-tab-bar>

      <div class="sections">${cache(this.renderTabbedContent())}</div>

      ${this.dialogTemplate || ''}
    `;
  }

  private renderTabbedContent() {
    switch (this.currentTab) {
      case 'actions':
        return html`
          <character-view-test-actions
            .character=${this.character}
            .ego=${this.character.ego}
          ></character-view-test-actions>
          <character-view-attacks-section
            .character=${this.character}
            .token=${this.token}
          ></character-view-attacks-section>
        `;

      case 'inventory':
        return html`
          ${repeat(
            difference(enumValues(ItemGroup), [ItemGroup.Traits]),
            identity,
            this.renderItemGroup,
          )}
        `;

      case 'traits':
        return this.renderItemGroup(ItemGroup.Traits);

      case 'details':
        return this.renderDetails();
    }
  }

  private renderStatus() {
    const {
      awaitingOnsetSubstances,
      activeSubstances,
      conditions,
      pools,
      disabled,
      temporaryConditionSources,
      sleeve,
    } = this.character;
    return html` <section class="status">
      <!-- <sl-header heading=${localize('status')}></sl-header> -->
      <div class="status-items">
        <!-- <div class="conditions">
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
                    value=${temporaryConditionSources.get(condition)?.length ||
                    1}
                  ></notification-coin>`
                : ''}
            </button>
          `,
        )}
          </div>
        </div> -->
        <!-- 
          ${sleeve && sleeve.type !== ActorType.Infomorph
          ? html`
              <div class="combat-state">
                ${renderUpdaterForm(
                  this.character.updater.path('data', 'combatState'),
                  {
                    disabled: disabled,
                    fields: ({ aggressive, complexAim, fullDefense }) => [
                      html`
                        <div class="combat-toggles">
                          ${[
                            renderLabeledCheckbox(aggressive),
                            renderLabeledCheckbox(complexAim),
                          ]}
                        </div>
                      `,
                      renderSelectField(
                        fullDefense,
                        enumValues(FullDefenseType),
                        emptyTextDash,
                      ),
                    ],
                  },
                )}
              </div>
            `
          : ''} -->

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
      </div>
    </section>`;
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
        ?noCollapse=${group === ItemGroup.Traits}
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
}

declare global {
  interface HTMLElementTagNameMap {
    'character-view': CharacterView;
  }
}
