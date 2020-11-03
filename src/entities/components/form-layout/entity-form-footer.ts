import { renderTextInput } from '@src/components/field/fields';
import { renderUpdaterForm } from '@src/components/form/forms';
import type { UpdateStore } from '@src/entities/update-store';
import { customElement, LitElement, property, html } from 'lit-element';
import styles from './entity-form-footer.scss';

@customElement('entity-form-footer')
export class EntityFormFooter extends LitElement {
  static get is() {
    return 'entity-form-footer' as const;
  }

  static styles = [styles];

  @property({
    attribute: false,
    type: Object,
    hasChanged() {
      return true;
    },
  })
  updater!: UpdateStore<{
    reference: string;
  }>;

  render() {
    return html`
      ${renderUpdaterForm(this.updater.prop(''), {
        disabled: !this.updater.editable,
        fields: ({ reference }) => html`
          <label>${reference.label}: ${renderTextInput(reference)}</label>
        `,
      })}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'entity-form-footer': EntityFormFooter;
  }
}
