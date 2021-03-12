import type {
  RangedAttackMessageData,
  SuccessTestMessageData,
} from '@src/chat/message-data';
import { customElement, property } from 'lit-element';
import { MessageElement } from '../message-element';
import styles from './message-ranged-attack.scss';

@customElement('message-ranged-attack')
export class MessageRangedAttack extends MessageElement {
  static get is() {
    return 'message-ranged-attack' as const;
  }

  static get styles() {
    return [styles];
  }

  @property({ type: Object }) rangedAttack!: RangedAttackMessageData;

  @property({ type: Object }) successTest?: SuccessTestMessageData;
}

declare global {
  interface HTMLElementTagNameMap {
    'message-ranged-attack': MessageRangedAttack;
  }
}
