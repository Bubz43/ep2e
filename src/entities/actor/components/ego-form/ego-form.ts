import {
  renderSelectField,
  renderTextField,
  renderLabeledCheckbox,
  renderNumberField,
} from '@src/components/field/fields';
import { renderUpdaterForm } from '@src/components/form/forms';
import { TabsMixin } from '@src/components/mixins/tabs-mixin';
import {
  AptitudeType,
  EgoSetting,
  EgoType,
  enumValues,
  Fork,
} from '@src/data-enums';
import { entityFormCommonStyles } from '@src/entities/components/form-layout/entity-form-common-styles';
import { FormDrawer } from '@src/entities/components/form-layout/entity-form-drawer-mixin';
import { addUpdateRemoveFeature } from '@src/features/feature-helpers';
import { Aptitudes, FieldSkillType } from '@src/features/skills';
import { localize } from '@src/foundry/localization';
import { tooltip } from '@src/init';
import type { FieldProps, FieldPropsRenderer } from '@src/utility/field-values';
import { customElement, LitElement, property, html } from 'lit-element';
import { cache } from 'lit-html/directives/cache';
import mix from 'mix-with/lib';
import { createPipe, map, mapToObj, toPairs } from 'remeda';
import type { Ego } from '../../ego';
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

  private readonly fieldSkillActions = mapToObj(
    enumValues(FieldSkillType),
    (type) => [
      type,
      addUpdateRemoveFeature(
        () => this.ego.updater.prop('data', 'fieldSkills', type).commit,
      ),
    ],
  );

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
          <ego-form-skills slot="details" .ego=${this.ego}></ego-form-skills>
        `;
    }
  }

  private renderDetails() {
    const { settings } = this.ego;
    return html`
      <div slot="details">
        <section>
          <sl-header heading=${localize('motivations')}></sl-header>
        </section>

        ${settings.trackReputations
          ? html`<section>
              <sl-header heading=${localize('reputations')}></sl-header>
            </section>`
          : ''}
        ${settings.trackMentalHealth
          ? html`
              <section>
                <sl-header heading=${localize('mentalHealth')}></sl-header>
              </section>
            `
          : ''}

        <section>
          <sl-header heading=${localize('traits')}></sl-header>
        </section>

        <section>
          <sl-header heading=${localize('notes')}>
            <mwc-icon
              slot="info"
              data-tooltip="${localize('mentalEdits')}, ${localize(
                'forks',
              )} & ${localize('backups')}"
              @mouseover=${tooltip.fromData}
            >info</mwc-icon>
          </sl-header>
        </section>
      </div>
    `;
  }

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
}

declare global {
  interface HTMLElementTagNameMap {
    'ego-form': EgoForm;
  }
}
