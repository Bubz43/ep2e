import type {
  PsiTestData,
  SuccessTestMessageData,
} from '@src/chat/message-data';
import { customElement, html, property } from 'lit-element';
import { last } from 'remeda';
import { MessageElement } from '../message-element';
import styles from './message-psi-test.scss';

@customElement('message-psi-test')
export class MessagePsiTest extends MessageElement {
  static get is() {
    return 'message-psi-test' as const;
  }

  static get styles() {
    return [styles];
  }

  @property({ type: Object }) psiTest!: PsiTestData;

  @property({ type: Object }) successTest!: SuccessTestMessageData;

  get successTestInfo() {
    const test = this.successTest;
    const result = last(test.states || [])?.result;

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
    'message-psi-test': MessagePsiTest;
  }
}
