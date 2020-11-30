import type { MessageData } from '@src/chat/message-data';
import type { ChatMessageEP } from '@src/entities/chat-message';
import { customElement, LitElement, property, html } from 'lit-element';
import styles from './message-content.scss';

@customElement('message-content')
export class MessageContent extends LitElement {
  static get is() {
    return 'message-content' as const;
  }

  static styles = [styles];

  @property({ attribute: false }) message!: ChatMessageEP;

  @property({ type: Object }) data!: MessageData;

  render() {
    const { header, stress } = this.data;
    return html`
      ${header ? html` <message-header .data=${header}></message-header> ` : ''}
      ${stress
        ? html` <message-stress-test .stress=${stress}></message-stress-test> `
        : ''}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'message-content': MessageContent;
  }
}
