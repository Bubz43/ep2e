import type { MessageHeaderData } from '@src/chat/message-data';
import { notEmpty } from '@src/utility/helpers';
import {
  customElement,
  LitElement,
  property,
  html,
  internalProperty,
} from 'lit-element';
import styles from './message-header.scss';

@customElement('message-header')
export class MessageHeader extends LitElement {
  static get is() {
    return 'message-header' as const;
  }

  static styles = [styles];

  @property({ type: Object }) data!: MessageHeaderData;

  @internalProperty() descriptionOpen = false;

  private toggleDescription() {
    this.descriptionOpen = !this.descriptionOpen;
  }

  render() {
    const { img, heading, subheadings, description } = this.data;
    return html`
      <header>
        <div class="headings ${img ? 'with-image' : ''}">
          <h3>${heading}</h3>
          ${notEmpty(subheadings)
            ? html`<h4 class="details">${[subheadings].flat().join(' • ')}</h4>`
            : ''}
        </div>

        ${img
          ? html`
              <img class="main-image" src=${img} height="40px" loading="lazy" />
            `
          : ''}
      </header>

      ${description && this.descriptionOpen
        ? html`
            <enriched-html
              class="description"
              .content=${description}
            ></enriched-html>
          `
        : html``}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'message-header': MessageHeader;
  }
}
