import { renderTextInput } from '@src/components/field/fields';
import { renderAutoForm } from '@src/components/form/forms';
import type { StringID } from '@src/features/feature-helpers';
import { Motivation, MotivationStance } from '@src/features/motivations';
import { customElement, LitElement, property, html } from 'lit-element';
import styles from './form-motivation-item.scss';
import { UpdatedMotivationEvent } from './updated-motivation-event';

/**
 * @fires updated-motivation
 */
@customElement('form-motivation-item')
export class FormMotivationItem extends LitElement {
  static get is() {
    return 'form-motivation-item' as const;
  }

  static styles = [styles];

  @property({ type: Object }) motivation!: Motivation | StringID<Motivation>;

  @property({ type: Boolean }) disabled = false;

  private toggleStance() {
    this.emitUpdate({
      stance:
        this.motivation.stance === MotivationStance.Support
          ? MotivationStance.Oppose
          : MotivationStance.Support,
    });
  }

  private emitUpdate(changed: Partial<Motivation>) {
    this.dispatchEvent(
      new UpdatedMotivationEvent(
        changed,
        'id' in this.motivation ? this.motivation.id : undefined,
      ),
    );
  }

  render() {
    const { motivation, disabled } = this;
    return html`
      <mwc-icon-button-toggle
        @click=${this.toggleStance}
        ?on=${motivation.stance === MotivationStance.Support}
        onIcon="add"
        offIcon="remove"
        ?disabled=${disabled}
      ></mwc-icon-button-toggle>
      ${renderAutoForm({
        props: motivation,
        update: this.emitUpdate,
        classes: "cause-form",
        disabled,
        fields: ({ cause }) =>
          renderTextInput(cause, { placeholder: cause.label }),
      })}
      <delete-button class="delete-self-button" ?disabled=${disabled}></delete-button>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'form-motivation-item': FormMotivationItem;
  }
}
