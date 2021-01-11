import type { SuccessTestMessage } from '@src/chat/message-data';
import { localize } from '@src/foundry/localization';
import { customElement, LitElement, property, html } from 'lit-element';
import { MessageElement } from '../message-element';
import styles from './message-success-test.scss';

@customElement('message-success-test')
export class MessageSuccessTest extends MessageElement {
  static get is() {
    return 'message-success-test' as const;
  }

  static get styles() {
    return [styles];
  }

  @property({ attribute: false }) successTest!: SuccessTestMessage;

  render() {
    const { parts, roll, target, result } = this.successTest;
    return html`
      <sl-group label=${localize('roll')}>${roll}</sl-group>
      <sl-group label=${localize('target')}>${target}</sl-group>
      <sl-group label=${localize('result')}>${localize(result)}</sl-group>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'message-success-test': MessageSuccessTest;
  }
}
