import type { MessageHeaderData } from '@src/chat/message-data';
import { localize } from '@src/foundry/localization';
import { notEmpty } from '@src/utility/helpers';
import {
  customElement,
  LitElement,
  property,
  html,
  internalProperty,
  PropertyValues,
} from 'lit-element';
import { classMap } from 'lit-html/directives/class-map';
import { ifDefined } from 'lit-html/directives/if-defined';
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
          <h3 title=${heading}>${heading}</h3>
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

      ${description
        ? html`
              <enriched-html
                @click=${this.toggleDescription}
                class="description ${classMap({ expanded: this.descriptionOpen})}"
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
