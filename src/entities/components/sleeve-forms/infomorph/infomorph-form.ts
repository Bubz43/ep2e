import { renderTextField } from '@src/components/field/fields';
import { renderUpdaterForm } from '@src/components/form/forms';
import type { Infomorph } from '@src/entities/actor/proxies/infomorph';
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
    const { updater, disabled } = this.infomorph;
    return html`
      <entity-form-layout>
        ${renderUpdaterForm(updater.prop('data'), {
          slot: 'sidebar',
          disabled,
          fields: ({ subtype }) => [renderTextField(subtype)],
        })}
        <editor-wrapper
          slot="description"
          ?disabled=${disabled}
          .updateActions=${updater.prop('data', 'description')}
        ></editor-wrapper>
      </entity-form-layout>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'infomorph-form': InfomorphForm;
  }
}
