import type {
  CombatActionType,
  CombatParticipant,
  updateCombatState,
} from '@src/combat/combat-tracker';
import {
  renderNumberField,
  renderTextField,
} from '@src/components/field/fields';
import {
  renderSubmitForm,
  SlCustomStoreEvent,
} from '@src/components/form/forms';
import { openImagePicker, closeImagePicker } from '@src/foundry/foundry-apps';
import { customElement, LitElement, property, html } from 'lit-element';
import styles from './participant-editor.scss';

@customElement('participant-editor')
export class ParticipantEditor extends LitElement {
  static get is() {
    return 'participant-editor' as const;
  }

  static get styles() {
    return [styles];
  }

  @property({ type: Object }) participant!: CombatParticipant;

  private emitUpdate = (change: Partial<CombatParticipant>) => {
    this.dispatchEvent(
      new CustomEvent('participant-changed', {
        detail: change,
        bubbles: true,
        composed: true,
      }),
    );
  };

  render() {
    const { name, img = '', initiative } = this.participant;
    return html`
      ${renderSubmitForm({
        props: { name, img, initiative: initiative || 0 },
        update: this.emitUpdate,
        fields: ({ name, img, initiative }) => [
          renderTextField(name, { required: true }),
          renderTextField(img, {
            after: html`
              <button
                @click=${({ currentTarget }: Event) => {
                  openImagePicker(this, img.value, (path) => {
                    closeImagePicker(this);
                    currentTarget?.dispatchEvent(
                      new SlCustomStoreEvent({
                        key: img.prop,
                        value: path,
                      }),
                    );
                  });
                }}
              >
                ${img.value
                  ? html` <img src=${img.value} height="25px" /> `
                  : html`<mwc-icon>image_search</mwc-icon>`}
              </button>
            `,
          }),
          renderNumberField(initiative, { step: 0.01 }),
        ],
      })}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'participant-editor': ParticipantEditor;
  }
}
