import { createMessage } from '@src/chat/create-message';
import {
  renderCheckbox,
  renderLabeledCheckbox,
  renderNumberField,
  renderSelectField,
  renderTextareaField,
  renderTextField,
} from '@src/components/field/fields';
import { renderUpdaterForm } from '@src/components/form/forms';
import { TabsMixin } from '@src/components/mixins/tabs-mixin';
import {
  AptitudeType,
  CharacterDetail,
  CharacterPoint,
  EgoBackground,
  EgoCareer,
  EgoFaction,
  EgoInterest,
  EgoSetting,
  EgoType,
  enumValues,
  Fork,
  MinStressOption,
  ThreatLevel,
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
import type { RepNetwork } from '@src/features/reputations';
import type { Aptitudes } from '@src/features/skills';
import {
  handleDrop,
  DropType,
  itemDropToItemProxy,
} from '@src/foundry/drag-and-drop';
import { notify, NotificationType } from '@src/foundry/foundry-apps';
import { localize } from '@src/foundry/localization';
import { rollLabeledFormulas } from '@src/foundry/rolls';
import { hardeningTypes, StressType } from '@src/health/mental-health';
import { gameSettings, tooltip } from '@src/init';
import { debounce } from '@src/utility/decorators';
import type { FieldProps, FieldPropsRenderer } from '@src/utility/field-values';
import { notEmpty } from '@src/utility/helpers';
import { customElement, html, LitElement, property } from 'lit-element';
import { cache } from 'lit-html/directives/cache';
import { classMap } from 'lit-html/directives/class-map';
import { repeat } from 'lit-html/directives/repeat';
import mix from 'mix-with/lib';
import { createPipe, identity, map, toPairs } from 'remeda';
import { Ego } from '../../actor/ego';
import styles from './ego-form.scss';

const renderAptitudeField = ([, apt]: [
  string,
  FieldProps<Aptitudes>[AptitudeType],
]) => {
  return renderNumberField(
    { ...apt, label: `${localize('FULL', apt.prop)} (${apt.label})` },
    { min: 0, max: 30 },
  );
};

const renderAptitudeFields: FieldPropsRenderer<Aptitudes> = createPipe(
  toPairs,
  map(renderAptitudeField),
);

const itemGroupKeys = ['sleights', 'traits'] as const;

@customElement('ego-form')
export class EgoForm extends mix(LitElement).with(
  FormDrawer,
  TabsMixin(['details', 'skills', 'reps']),
) {
  static get is() {
    return 'ego-form' as const;
  }

  static styles = [entityFormCommonStyles, styles];

  @property({ attribute: false }) ego!: Ego;

  private readonly motivationOps = addUpdateRemoveFeature(
    () => this.ego.updater.path('data', 'motivations').commit,
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

  protected shouldRenderTab(tab: EgoForm['tabs'][number]) {
    return tab !== 'reps' || this.ego.settings.trackReputations;
  }

  private rollStress() {
    this.ego.rollStress();
  }

  render() {
    const { updater, disabled } = this.ego;
    const { activeTab } = this;
    return html`
      <entity-form-layout>
        <entity-form-header
          slot="header"
          .updateActions=${updater.path('')}
          type=${localize('ego')}
          ?disabled=${disabled}
        ></entity-form-header>
        ${this.renderTabBar('tabs')} ${this.renderSidebar()}
        ${cache(this.renderTabbedContent(this.activeTab))}
        ${activeTab === 'details'
          ? html`
              <editor-wrapper
                slot="description"
                ?disabled=${disabled}
                .updateActions=${updater.path('data', 'description')}
              ></editor-wrapper>
            `
          : ''}
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

      case 'reps':
        return this.renderReputations();
    }
  }

  private renderDetails() {
    const {
      settings,
      disabled,
      updater,
      motivations,
      itemGroups,
      psi,
    } = this.ego;
    const useCredits = gameSettings.credits.current;
    const { traits, sleights } = itemGroups;

    return html`
      <div slot="details">
        <sl-dropzone ?disabled=${disabled} @drop=${this.handleItemDrop}>
          <sl-header
            heading="${localize('traits')} ${this.ego.allowSleights
              ? `& ${localize('sleights')}`
              : ''}"
            itemCount=${traits.length + sleights.length}
            ?hideBorder=${!psi && traits.length + sleights.length === 0}
          >
            ${this.ego.allowSleights
              ? html` <mwc-icon
                  slot="info"
                  data-tooltip=${localize('DESCRIPTIONS', 'OnlyEgoItems')}
                  @mouseover=${tooltip.fromData}
                  >info</mwc-icon
                >`
              : ''}
          </sl-header>
          ${psi
            ? html`
                <div class="psi">
                  <span class="psi-info">
                    <span class="psi-label">${localize('psi')}:</span>
                    ${psi.fullName}
                    <span class="psi-level"
                      >${localize('level')} ${psi.level}</span
                    >
                  </span>
                  ${psi.openForm
                    ? html`
                        <mwc-icon-button
                          icon="launch"
                          @click=${psi.openForm}
                        ></mwc-icon-button>
                      `
                    : ''}
                  ${psi.deleteSelf
                    ? html`
                        <delete-button
                          ?disabled=${disabled}
                          @delete=${psi.deleteSelf}
                        ></delete-button>
                      `
                    : ''}
                </div>
              `
            : ''}
          ${itemGroupKeys.map((key) => {
            const group = itemGroups[key];
            return notEmpty(group)
              ? html`
                  <form-items-list
                    .items=${group}
                    label=${localize(key)}
                  ></form-items-list>
                `
              : '';
          })}
        </sl-dropzone>

        ${settings.threatDetails
          ? html`
              <section>
                <sl-header heading=${localize('threatDetails')}>
                  ${this.ego.hasStressRoll
                    ? html`
                        <mwc-button
                          class="stress-roll"
                          dense
                          slot="action"
                          label="${localize('SHORT', 'stressValue')}: ${this.ego
                            .stressValueInfo.value}"
                          @click=${this.rollStress}
                        ></mwc-button>
                      `
                    : ''}
                </sl-header>
                <div class="threat-details">
                  ${renderUpdaterForm(updater.path('data', 'threatDetails'), {
                    classes: 'threat-details-form',
                    disabled,
                    fields: ({ niche, numbers, level }) => [
                      renderTextField(niche),
                      renderTextField(numbers),
                      renderSelectField(
                        { ...level, label: localize('threatLevel') },
                        enumValues(ThreatLevel),
                      ),
                    ],
                  })}
                  <ego-form-threat-stress
                    ?disabled=${disabled}
                    .updateOps=${updater.path(
                      'data',
                      'threatDetails',
                      'stress',
                    )}
                  ></ego-form-threat-stress>
                </div>
              </section>
            `
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
                  : renderUpdaterForm(updater.path('data', 'points'), {
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
        ${settings.characterDetails
          ? html`
              <section>
                <sl-header heading=${localize('character')}></sl-header>
                ${renderUpdaterForm(updater.path('data', 'characterDetails'), {
                  disabled,
                  classes: 'character-details-form',
                  fields: (details) =>
                    enumValues(CharacterDetail).map((detail) =>
                      CharacterDetail.Languages === detail
                        ? renderTextareaField(details[detail], {
                            helpText: localize('commaSeperated'),
                            rows: 6,
                          })
                        : renderTextField(details[detail], {
                            listId: detail,
                          }),
                    ),
                })}
                ${this.detailDatalists}
              </section>
            `
          : ''}
      </div>
    `;
  }

  private detailDatalists = ([
    [EgoBackground, CharacterDetail.Background],
    [EgoCareer, CharacterDetail.Career],
    [EgoInterest, CharacterDetail.Interest],
    [EgoFaction, CharacterDetail.Faction],
  ] as const).map(
    ([list, id]) => html`
      <datalist id=${id}>
        ${enumValues(list).map(
          (listItem) => html` <option value=${localize(listItem)}></option> `,
        )}
      </datalist>
    `,
  );

  private renderMotivationItem = (
    motivation: StringID<Motivation>,
  ) => html` <form-motivation-item
    @updated-motivation=${this.updateMotivation}
    @delete=${this.motivationOps.removeCallback(motivation.id)}
    .motivation=${motivation}
    ?disabled=${this.ego.disabled}
  ></form-motivation-item>`;

  private renderSidebar() {
    const { updater, disabled, useThreat } = this.ego;

    return html`
      ${renderUpdaterForm(updater.path('data'), {
        slot: 'sidebar',
        disabled,
        fields: ({ egoType, forkType, flex, threat }) => [
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
          renderNumberField(
            useThreat
              ? threat
              : { ...flex, label: `${flex.label} ${localize('bonus')}` },
            { min: 0 },
          ),
        ],
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

      ${renderUpdaterForm(updater.path('data', 'aptitudes'), {
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
      ${renderUpdaterForm(this.ego.updater.path('data', 'settings'), {
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
      ${renderUpdaterForm(this.ego.updater.path('data', 'mentalHealth'), {
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

  private renderReputations() {
    return html`<section slot="details">
      ${repeat(this.ego.reps.keys(), identity, this.renderRep)}
    </section>`;
  }

  private renderRep = (network: RepNetwork) => html`
    <ego-form-rep
      .repOps=${this.ego.updater.path('data', 'reps', network)}
      network=${network}
      ?disabled=${this.ego.disabled}
    ></ego-form-rep>
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    'ego-form': EgoForm;
  }
}
