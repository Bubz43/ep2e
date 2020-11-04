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
    const { updater, disabled, itemGroups, pools, description } = this.infomorph;

    return html`
      <entity-form-layout>
        ${renderUpdaterForm(updater.prop('data'), {
          slot: 'sidebar',
          disabled,
          fields: ({ subtype }) => [renderTextField(subtype)],
        })}
        <div slot="details">
          <sleeve-form-pools
            .poolData=${pools}
            .poolBonuses=${itemGroups.effects.poolBonuses}
            ?disabled=${disabled}
            .editFn=${this.setDrawerFromEvent(this.renderPoolEdit)}
          ></sleeve-form-pools>
        </div>
        <!-- <tinymce-editor slot="description" value=${description} .on-Change=${(ev: unknown) => console.log(ev)} ></tinymce-editor> -->
        <editor-wrapper
          slot="description"
          ?disabled=${disabled}
          .updateActions=${updater.prop('data', 'description')}
        ></editor-wrapper>
      </entity-form-layout>
    `;
  }
  private renderPoolEdit() {
    return html`
      <h4>${localize('pools')}</h4>
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
