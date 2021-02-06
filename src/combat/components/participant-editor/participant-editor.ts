import type { CombatParticipant } from '@src/combat/combat-tracker';
import {
  renderNumberField,
  renderTextField,
} from '@src/components/field/fields';
import { renderSubmitForm } from '@src/components/form/forms';
import { customElement, html, LitElement, property } from 'lit-element';
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
    const { name, initiative } = this.participant;
    return html`
      ${renderSubmitForm({
        props: { name, initiative: initiative || 0 },
        update: this.emitUpdate,
        fields: ({ name, initiative }) => [
          renderTextField(name, { required: true }),
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
