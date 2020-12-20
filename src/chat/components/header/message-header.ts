import type { MessageHeaderData } from '@src/chat/message-data';
import { tooltip } from '@src/init';
import { notEmpty } from '@src/utility/helpers';
import {
  customElement,
  html,
  internalProperty,
  LitElement,
  property,
} from 'lit-element';
import { classMap } from 'lit-html/directives/class-map';
import { noop } from 'remeda';
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
    const { img, heading, subheadings, description, hidden } = this.data;
    const visibleHeading = hidden ? '???' : heading;
    // TODO show special hidden image which can reveal normal on hover for gm
    return html`
      <header>
        <div class="headings ${img && !hidden ? 'with-image' : ''}">
          <h3 title=${game.user.isGM ? heading : visibleHeading}>
            ${visibleHeading}
          </h3>
          ${notEmpty(subheadings)
            ? html`<h4
                class="details"
                @mouseover=${hidden && game.user.isGM
                  ? (ev: MouseEvent) => {
                      tooltip.attach({
                        el: ev.currentTarget as HTMLElement,
                        content: [subheadings].flat().join(' • '),
                      });
                    }
                  : noop}
              >
                ${hidden ? "??" : [subheadings].flat().join(' • ') }
              </h4>`
            : ''}
        </div>

        ${img && !hidden
          ? html`
              <img class="main-image" src=${img} height="40px" loading="lazy" />
            `
          : ''}
      </header>

      ${description
        ? html`
            <enriched-html
              @click=${this.toggleDescription}
              class="description ${classMap({
                expanded: this.descriptionOpen,
                hidden: !!hidden
              })}"
               @mouseover=${hidden && game.user.isGM
                  ? (ev: MouseEvent) => {
                      tooltip.attach({
                        el: ev.currentTarget as HTMLElement,
                        content: html`<enriched-html style="min-width: 400px" content=${description}></enriched-html>`,
                      });
                    }
                  : noop}
              .content=${hidden ? `<p>??????</p>` : description}
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
