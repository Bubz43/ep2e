import type {
  HackMessageData,
  SuccessTestMessageData,
} from '@src/chat/message-data';
import { Software } from '@src/entities/item/proxies/software';
import { customElement, html, LitElement, property } from 'lit-element';
import { last } from 'remeda';
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

  get software() {
    return new Software({
      data: this.hack.software,
      embedded: null,
    });
  }

  get successTestInfo() {
    const test = this?.successTest;
    const result = last(test?.states || [])?.result;

    return result && test
      ? {
          result,
          superiorEffects: test.superiorResultEffects,
        }
      : null;
  }

  render() {
    return html``;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'message-hack': MessageHack;
  }
}
