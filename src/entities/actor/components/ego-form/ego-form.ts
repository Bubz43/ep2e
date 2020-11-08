import { TabsMixin } from '@src/components/mixins/tabs-mixin';
import { enumValues } from '@src/data-enums';
import { FormDrawer } from '@src/entities/components/form-layout/entity-form-drawer-mixin';
import { addUpdateRemoveFeature } from '@src/features/feature-helpers';
import { FieldSkillType } from '@src/features/skills';
import { localize } from '@src/foundry/localization';
import { customElement, LitElement, property, html } from 'lit-element';
import mix from 'mix-with/lib';
import { mapToObj } from 'remeda';
import type { Ego } from '../../ego';
import styles from './ego-form.scss';

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
        ${this.renderTabBar('tabs')} ${this.renderDrawerContent()}
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
    return html``;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ego-form': EgoForm;
  }
}
