import type {
  HackMessageData,
  SuccessTestMessageData,
} from '@src/chat/message-data';
import { customElement, html, LitElement, property } from 'lit-element';
import styles from './message-hack.scss';

@customElement('message-hack')
export class MessageHack extends LitElement {
  static get is() {
    return 'message-hack' as const;
  }

  static get styles() {
    return [styles];
  }

  @property({ type: Object }) hack!: HackMessageData;

  @property({ type: Object }) successTest?: SuccessTestMessageData;

  render() {
    return html``;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'message-hack': MessageHack;
  }
}
