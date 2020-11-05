import {
  renderNumberField,
  renderTextField,
} from '@src/components/field/fields';
import { renderUpdaterForm } from '@src/components/form/forms';
import { enumValues, PoolType } from '@src/data-enums';
import type { Infomorph } from '@src/entities/actor/proxies/infomorph';
import { localize } from '@src/foundry/localization';
import { customElement, property, html } from 'lit-element';
import { SleeveFormBase } from '../sleeve-form-base';
import styles from './infomorph-form.scss';

@customElement('infomorph-form')
export class InfomorphForm extends SleeveFormBase {
  static get is() {
    return 'infomorph-form' as const;
  }

  static styles = [styles];

  @property({ attribute: false }) infomorph!: Infomorph;

  render() {
    const {
      updater,
      disabled,
      itemGroups,
      pools,
      meshHealth,
      description,
    } = this.infomorph;

    return html`
      <entity-form-layout noSidebar>
        <div slot="details">
          <sleeve-form-pools
            .poolData=${pools}
            .poolBonuses=${itemGroups.effects.poolBonuses}
            ?disabled=${disabled}
            .editFn=${this.setDrawerFromEvent(this.renderPoolEdit)}
          ></sleeve-form-pools>
          <sleeve-form-acquisition
            .updateActions=${updater.prop('data', 'acquisition')}
            ?disabled=${disabled}
          ></sleeve-form-acquisition>

          <health-item
            clickable
            ?disabled=${disabled}
            .health=${meshHealth}
          ></health-item>
        </div>
        <editor-wrapper
          slot="description"
          ?disabled=${disabled}
          .updateActions=${updater.prop('data', 'description')}
        ></editor-wrapper>
        ${this.renderDrawerContent()}
      </entity-form-layout>
    `;
  }
  private renderPoolEdit() {
    return html`
      <h3>${localize('pools')}</h3>
      ${renderUpdaterForm(this.infomorph.updater.prop('data', 'pools'), {
        fields: (pools) =>
          enumValues(PoolType).map((type) =>
            type === PoolType.Threat
              ? ''
              : renderNumberField(pools[type], { min: 0 }),
          ),
      })}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'infomorph-form': InfomorphForm;
  }
}
