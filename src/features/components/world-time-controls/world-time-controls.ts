import { createMessage } from '@src/chat/create-message';
import { renderTimeField } from '@src/components/field/fields';
import { renderAutoForm } from '@src/components/form/forms';
import { advanceWorldTime, prettyMilliseconds } from '@src/features/time';
import { format, localize } from '@src/foundry/localization';
import { customElement, html, internalProperty, LitElement } from 'lit-element';
import styles from './world-time-controls.scss';

@customElement('world-time-controls')
export class WorldTimeControls extends LitElement {
  static get is() {
    return 'world-time-controls' as const;
  }

  static styles = [styles];

  @internalProperty() timeChange = 0;

  private modifyTime(forwards: boolean) {
    this.timeChange && advanceWorldTime(this.timeChange * (forwards ? 1 : -1));
    createMessage({
      content: format('ModifiedTime', {
        direction: localize(forwards ? 'advanced' : 'rewound'),
        amount: prettyMilliseconds(this.timeChange),
      }),
      entity: null
    });
    this.timeChange = 0;
  }

  private advanceTime() {
    this.modifyTime(true);
  }

  private reverseTime() {
    this.modifyTime(false);
  }

  render() {
    const disabled = this.timeChange === 0;
    return html`
      <mwc-icon-button
        ?disabled=${disabled}
        icon="fast_rewind"
        @click=${this.reverseTime}
      >
      </mwc-icon-button>
      ${renderAutoForm({
        noDebounce: true,
        props: { change: this.timeChange },
        update: ({ change = 0 }) => (this.timeChange = change),
        fields: ({ change }) =>
          renderTimeField(
            { ...change, label: '' },
            { whenZero: `${localize('modify')} ${localize('time')}` },
          ),
      })}
      <mwc-icon-button
        ?disabled=${disabled}
        icon="fast_forward"
        @click=${this.advanceTime}
      >
      </mwc-icon-button>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'world-time-controls': WorldTimeControls;
  }
}
