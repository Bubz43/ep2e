import type { TaskMessageData } from '@src/chat/message-data';
import { ActorType } from '@src/entities/entity-types';
import { localize } from '@src/foundry/localization';
import { customElement, LitElement, property, html } from 'lit-element';
import { last } from 'remeda';
import { MessageElement } from '../message-element';
import styles from './message-task-action.scss';

@customElement('message-task-action')
export class MessageTaskAction extends MessageElement {
  static get is() {
    return 'message-task-action' as const;
  }

  static get styles() {
    return [styles];
  }

  @property({ type: Object }) task!: TaskMessageData;

  private get successTestResult() {
    return last(this.message.epFlags?.successTest?.states || [])?.result;
  }

  render() {
    const { favor } = this.task;
    return html`
      <sl-popover .renderOnDemand=${this.renderTaskStart}>
        <mwc-button slot="base" unelevated dense
          >${localize('start')} ${localize('task')}</mwc-button
        >
      </sl-popover>
    `;
  }

  private renderTaskStart = () => {
    const { successTestResult, message, task } = this;
    if (message.actor?.proxy.type !== ActorType.Character) {
      return html`
        <p>
          ${localize('character')} ${localize('required')} ${localize('to')}
          ${localize('start')} ${localize('task')}
        </p>
      `;
    }
    const { ego, equippedGroups } = message.actor.proxy
    const { favor } = task;
    return html`
    
    `;
  };
}

declare global {
  interface HTMLElementTagNameMap {
    'message-task-action': MessageTaskAction;
  }
}
