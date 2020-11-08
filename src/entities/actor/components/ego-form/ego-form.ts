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
import { FormDrawer } from '@src/entities/components/form-layout/entity-form-drawer-mixin';
import { addUpdateRemoveFeature } from '@src/features/feature-helpers';
import { Aptitudes, FieldSkillType } from '@src/features/skills';
import { localize } from '@src/foundry/localization';
import type { FieldProps, FieldPropsRenderer } from '@src/utility/field-values';
import { customElement, LitElement, property, html } from 'lit-element';
import mix from 'mix-with/lib';
import { createPipe, map, mapToObj, toPairs } from 'remeda';
import type { Ego } from '../../ego';
import styles from './ego-form.scss';

const aptitudeSettings = { min: 0, max: 30, helpPersistent: false } as const;

const renderAptitudeField = ([, apt]: [
  string,
  FieldProps<Aptitudes>[AptitudeType],
]) => {
  return renderNumberField(
    { ...apt, label: localize('FULL', apt.prop) },
    aptitudeSettings,
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

  static styles = [styles];

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
        ${this.renderTabbedContent(this.activeTab)}
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
      <sl-popover
        class="settings-popover"
        slot="sidebar"
        center
        .renderOnDemand=${this.renderSettingsForm}
      >
        <mwc-button
          label=${localize('settings')}
          outlined
          icon="settings"
          slot="base"
          ?disabled=${disabled}
          trailingIcon
        ></mwc-button>
      </sl-popover>
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

  private renderSettingsForm = () =>
    renderUpdaterForm(this.ego.updater.prop('data', 'settings'), {
      disabled: this.ego.disabled,
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
      classes: 'settings-form',
    });

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
    return html``;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ego-form': EgoForm;
  }
}
