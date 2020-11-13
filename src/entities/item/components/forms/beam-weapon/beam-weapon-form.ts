import { renderUpdaterForm } from '@src/components/form/forms';
import { entityFormCommonStyles } from '@src/entities/components/form-layout/entity-form-common-styles';
import { BeamWeapon } from '@src/entities/item/proxies/beam-weapon';
import { localize } from '@src/foundry/localization';
import { customElement, html, property } from 'lit-element';
import { repeat } from 'lit-html/directives/repeat';
import { identity } from 'remeda';
import {
  complexityForm,
  renderComplexityFields,
  renderRangedAccessoriesEdit,
} from '../common-gear-fields';
import { ItemFormBase } from '../item-form-base';
import styles from './beam-weapon-form.scss';

@customElement('beam-weapon-form')
export class BeamWeaponForm extends ItemFormBase {
  static get is() {
    return 'beam-weapon-form' as const;
  }

  static styles = [entityFormCommonStyles, complexityForm.styles, styles];

  @property({ attribute: false }) item!: BeamWeapon;

  render() {
    const { updater, type, accessories } = this.item;
    const { disabled } = this;
    return html`
      <entity-form-layout>
        <entity-form-header
          noDefaultImg
          slot="header"
          .updateActions=${updater.prop('')}
          type=${localize(type)}
          ?disabled=${disabled}
        >
        </entity-form-header>

        ${renderUpdaterForm(updater.prop('data'), {
          disabled,
          slot: 'sidebar',
          fields: () => [],
        })}

        <div slot="details">
          ${renderUpdaterForm(updater.prop('data'), {
            disabled,
            classes: complexityForm.cssClass,
            fields: renderComplexityFields,
          })}

          <section>
            <sl-header heading=${localize('accessories')}>
              <mwc-icon-button
                slot="action"
                icon="edit"
                ?disabled=${disabled}
                @click=${this.setDrawerFromEvent(this.renderAccessoriesEdit)}
              ></mwc-icon-button>
            </sl-header>

            <sl-animated-list class="accessories-list">
              ${repeat(
                accessories,
                identity,
                (accessory) => html` <li>${localize(accessory)}</li> `,
              )}
            </sl-animated-list>
          </section>
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

  private renderAccessoriesEdit() {
    return renderRangedAccessoriesEdit(
      this.item.accessories,
      BeamWeapon.possibleAccessories,
      this.item.updater.prop('data', 'accessories').commit,
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'beam-weapon-form': BeamWeaponForm;
  }
}
