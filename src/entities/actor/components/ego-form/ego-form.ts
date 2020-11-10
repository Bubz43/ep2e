import {
  renderCheckbox,
  renderLabeledCheckbox,
  renderNumberField,
  renderSelectField,
  renderTextField,
} from '@src/components/field/fields';
import { renderUpdaterForm } from '@src/components/form/forms';
import { TabsMixin } from '@src/components/mixins/tabs-mixin';
import {
  AptitudeType,
  CharacterPoint,
  EgoSetting,
  EgoType,
  enumValues,
  Fork,
} from '@src/data-enums';
import { entityFormCommonStyles } from '@src/entities/components/form-layout/entity-form-common-styles';
import { FormDrawer } from '@src/entities/components/form-layout/entity-form-drawer-mixin';
import type { UpdatedMotivationEvent } from '@src/features/components/form-motivation-item/updated-motivation-event';
import {
  addUpdateRemoveFeature,
  idProp,
  StringID,
} from '@src/features/feature-helpers';
import { createMotivation, Motivation } from '@src/features/motivations';
import type { Aptitudes } from '@src/features/skills';
import {
  handleDrop,
  DropType,
  itemDropToItemProxy,
} from '@src/foundry/drag-and-drop';
import { notify, NotificationType } from '@src/foundry/foundry-apps';
import { localize } from '@src/foundry/localization';
import { hardeningTypes } from '@src/health/mental-health';
import { gameSettings, tooltip } from '@src/init';
import { debounce } from '@src/utility/decorators';
import type { FieldProps, FieldPropsRenderer } from '@src/utility/field-values';
import { customElement, html, LitElement, property } from 'lit-element';
import { cache } from 'lit-html/directives/cache';
import { classMap } from 'lit-html/directives/class-map';
import { repeat } from 'lit-html/directives/repeat';
import mix from 'mix-with/lib';
import { createPipe, map, toPairs } from 'remeda';
import { Ego } from '../../ego';
import styles from './ego-form.scss';

const renderAptitudeField = ([, apt]: [
  string,
  FieldProps<Aptitudes>[AptitudeType],
]) => {
  return renderNumberField(
    { ...apt, label: localize('FULL', apt.prop) },
    { min: 0, max: 30 },
  );
};

const renderAptitudeFields: FieldPropsRenderer<Aptitudes> = createPipe(
  toPairs,
  map(renderAptitudeField),
);

const itemGroupKeys = ['traits', 'sleights'] as const;

@customElement('ego-form')
export class EgoForm extends mix(LitElement).with(
  FormDrawer,
  TabsMixin(['details', 'skills']),
) {
  static get is() {
    return 'ego-form' as const;
  }

  static styles = [entityFormCommonStyles, styles];

  @property({ attribute: false }) ego!: Ego;

  private readonly motivationOps = addUpdateRemoveFeature(
    () => this.ego.updater.prop('data', 'motivations').commit,
  );

  private readonly activeForkOps = addUpdateRemoveFeature(
    () => this.ego.updater.prop('data', 'activeForks').commit,
  );

  private readonly backupOps = addUpdateRemoveFeature(
    () => this.ego.updater.prop('data', 'backups').commit,
  );

  private updateMotivation({ changed, id }: UpdatedMotivationEvent) {
    if (id) this.motivationOps.update(changed, { id });
  }

  private addMotivation() {
    this.motivationOps.add({}, createMotivation({}));
  }

  private handleItemDrop = handleDrop(async ({ data }) => {
    if (data?.type === DropType.Item) {
      this.ego.addNewItemProxy(await itemDropToItemProxy(data));
    } else
      notify(NotificationType.Info, localize('DESCRIPTIONS', 'OnlyEgoItems'));
  });

  render() {
    const { updater, disabled } = this.ego;
    const { activeTab } = this;
    return html`
      <entity-form-layout>
        <entity-form-header
          slot="header"
          .updateActions=${updater.prop('')}
          type=${localize('ego')}
        ></entity-form-header>
        ${this.renderTabBar('tabs')} ${this.renderSidebar()}
        ${cache(this.renderTabbedContent(this.activeTab))}
        ${activeTab === 'skills'
          ? ''
          : html`
              <editor-wrapper
                slot="description"
                ?disabled=${disabled}
                .updateActions=${updater.prop('data', 'description')}
              ></editor-wrapper>
            `}
        ${this.renderDrawerContent()}
      </entity-form-layout>
    `;
  }

  protected renderTabbedContent(tab: EgoForm['tabs'][number]) {
    switch (tab) {
      case 'details':
        return this.renderDetails();

      case 'skills':
        return html`
          <ego-form-skills
            @open-field-form=${this.setDrawerFromEvent(this.renderFieldCreator)}
            slot="details"
            .ego=${this.ego}
          ></ego-form-skills>
        `;
    }
  }

  private renderDetails() {
    const {
      settings,
      disabled,
      updater,
      motivations,
      backups,
      activeForks,
      mentalEdits,
      itemGroups,
    } = this.ego;
    const useCredits = gameSettings.credits.current;
    const { traits, sleights } = itemGroups;

    return html`
      <div slot="details">
        ${settings.trackMentalHealth
          ? html`
              <section>
                <sl-header heading=${localize('mentalHealth')}
                  ><mwc-icon-button
                    slot="action"
                    data-tooltip=${localize('changes')}
                    @mouseover=${tooltip.fromData}
                    @focus=${tooltip.fromData}
                    icon="change_history"
                    @click=${this.setDrawerFromEvent(
                      this.renderMentalHealthChangeHistory,
                      false,
                    )}
                  ></mwc-icon-button
                ></sl-header>
                <health-item
                  clickable
                  ?disabled=${disabled}
                  .health=${this.ego.mentalHealth}
                  @click=${this.setDrawerFromEvent(this.renderMentalHealthEdit)}
                ></health-item>
              </section>
            `
          : ''}

        <sl-dropzone ?disabled=${disabled} @drop=${this.handleItemDrop}>
          <sl-header
            heading="${localize('traits')} & ${localize('sleights')}"
            itemCount=${traits.length + sleights.length}
            ?hideBorder=${traits.length + sleights.length === 0}
          >
            <mwc-icon
              slot="info"
              data-tooltip=${localize('DESCRIPTIONS', 'OnlyEgoItems')}
              @mouseover=${tooltip.fromData}
              >info</mwc-icon
            >
          </sl-header>
          ${itemGroupKeys.map((key) => {
            const group = itemGroups[key];
            return html`
              <form-items-list
                .items=${group}
                label=${localize(key)}
              ></form-items-list>
            `;
          })}
        </sl-dropzone>
        <section>
          <sl-header
            heading=${localize('motivations')}
            itemCount=${motivations.length}
            ?hideBorder=${motivations.length === 0}
          >
            <mwc-icon-button
              icon="add"
              slot="action"
              ?disabled=${disabled}
              @click=${this.addMotivation}
              data-tooltip="${localize('add')} ${localize('motivation')}"
              @mouseover=${tooltip.fromData}
              @focus=${tooltip.fromData}
            ></mwc-icon-button>
          </sl-header>

          <sl-animated-list class="motivations-list" transformOrigin="top">
            ${repeat(motivations, idProp, this.renderMotivationItem)}
          </sl-animated-list>
        </section>

        ${settings.trackReputations
          ? html`<section>
              <sl-header
                heading=${localize('reputations')}
                itemCount=${this.ego.reps.size}
                ?hideBorder=${this.ego.reps.size === 0}
              ></sl-header>
              ${repeat(
                this.ego.reps,
                ([network]) => network,
                ([network, rep]) => {
                  return html`
                    <li class="rep">
                      ${renderUpdaterForm(
                        updater.prop('data', 'reps', network),
                        {
                          disabled,
                          classes: 'rep-form',
                          fields: ({ track, score }) => html`
                            ${renderCheckbox(track)}
                            <span
                              >${localize('FULL', network)}
                              <span class="network-abbreviation"
                                >(${localize(network)})</span
                              ></span
                            >
                            ${renderNumberField(score)}
                          `,
                        },
                      )}
                    </li>
                  `;
                },
              )}
            </section>`
          : ''}
        ${settings.trackPoints
          ? html`
              <section
                class="resource-points-section ${classMap({ disabled })}"
              >
                <sl-header
                  heading="${localize('resource')} ${localize('points')}"
                >
                  <sl-animated-list class="ego-points-simple" slot="action">
                    ${repeat(
                      this.ego.points,
                      ({ label }) => label,
                      ({ label, value }) => html`
                        <sl-group role="listitem" label=${label}
                          ><span class="value">${value}</span></sl-group
                        >
                      `,
                    )}
                  </sl-animated-list>
                </sl-header>
                ${disabled
                  ? ''
                  : renderUpdaterForm(updater.prop('data', 'points'), {
                      disabled,
                      classes: 'points-form',
                      fields: (points) =>
                        enumValues(CharacterPoint).map((point) =>
                          useCredits || point !== CharacterPoint.Credits
                            ? renderNumberField(
                                {
                                  ...points[point],
                                  label: Ego.formatPoint(point),
                                },
                                { min: -99, max: 99 },
                              )
                            : '',
                        ),
                    })}
              </section>
            `
          : ''}

        <section>
          <sl-header
            heading=${localize('notes')}
            ?hideBorder=${!this.ego.hasNotes}
          >
            <mwc-icon
              slot="info"
              data-tooltip="${localize('mentalEdits')}, ${localize(
                'forks',
              )} & ${localize('backups')}"
              @mouseover=${tooltip.fromData}
              >info</mwc-icon
            >
          </sl-header>
        </section>
      </div>
    `;
  }

  private renderMotivationItem = (
    motivation: StringID<Motivation>,
  ) => html` <form-motivation-item
    @updated-motivation=${this.updateMotivation}
    @delete=${this.motivationOps.removeCallback(motivation.id)}
    .motivation=${motivation}
    ?disabled=${this.ego.disabled}
  ></form-motivation-item>`;

  private renderSidebar() {
    const { updater, disabled } = this.ego;

    return html`
      ${renderUpdaterForm(updater.prop('data'), {
        slot: 'sidebar',
        fields: ({ egoType, forkType }) => [
          renderSelectField(
            { ...forkType, label: localize('type') },
            enumValues(Fork),
            {
              emptyText: `${localize('prime')} ${localize('ego')}`,
              altLabel: (fork) => `${localize(fork)} ${localize('fork')}`,
            },
          ),
          renderTextField(
            { ...egoType, label: localize('class') },
            { listId: 'ego-types' },
          ),
          this.egoTypes,
        ],
        disabled,
      })}

      <mwc-button
        label=${localize('settings')}
        icon="settings"
        slot="sidebar"
        ?disabled=${disabled}
        class="settings-toggle"
        trailingIcon
        @click=${this.setDrawerFromEvent(this.renderSettingsForm)}
      ></mwc-button>

      <entity-form-sidebar-divider
        slot="sidebar"
        label="aptitudes"
      ></entity-form-sidebar-divider>

      ${renderUpdaterForm(updater.prop('data', 'aptitudes'), {
        slot: 'sidebar',
        classes: 'aptitudes',
        fields: renderAptitudeFields,
        disabled,
      })}
    `;
  }

  private egoTypes = html`
    <datalist id="ego-types">
      ${enumValues(EgoType).map(
        (type) => html` <option value=${localize(type)}></option> `,
      )}
    </datalist>
  `;

  private renderSettingsForm() {
    return html`
      <h3>${localize('settings')}</h3>
      ${renderUpdaterForm(this.ego.updater.prop('data', 'settings'), {
        disabled: this.ego.disabled,
        classes: 'settings-form',
        fields: (props) =>
          enumValues(EgoSetting).map((setting) => {
            const prop = props[setting];
            return setting === EgoSetting.TrackPoints
              ? renderLabeledCheckbox({
                  ...prop,
                  label: localize('trackResourcePoints'),
                })
              : renderLabeledCheckbox(prop);
          }),
      })}
    `;
  }

  private renderMentalHealthChangeHistory() {
    return html`
      <h3>${localize('history')}</h3>
      <health-log
        .health=${this.ego.mentalHealth}
        ?disabled=${this.ego.disabled}
      ></health-log>
    `;
  }

  private renderMentalHealthEdit() {
    return html`
      <h3>${localize('edit')} ${localize('mentalHealth')}</h3>
      <health-state-form .health=${this.ego.mentalHealth}></health-state-form>

      <p class="hardening-label">${localize('hardening')}</p>
      ${renderUpdaterForm(this.ego.updater.prop('data', 'mentalHealth'), {
        fields: (hardenings) =>
          hardeningTypes.map((type) =>
            renderNumberField(hardenings[type], { min: 0, max: 5 }),
          ),
      })}
    `;
  }

  private renderFieldCreator() {
    return html`
      <h3>${localize('create')} ${localize('fieldSkill')}</h3>
      <ego-form-field-skill-creator
        .ego=${this.ego}
      ></ego-form-field-skill-creator>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ego-form': EgoForm;
  }
}
