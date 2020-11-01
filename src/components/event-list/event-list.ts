import { customElement, LitElement, property, html, query } from 'lit-element';
import styles from './event-list.scss';
import { repeat } from 'lit-html/directives/repeat';

@customElement('event-list')
export class EventList extends LitElement {
  static get is() {
    return 'event-list' as const;
  }

  static styles = [styles];

  @query('.scroll-target', true)
  private scrollTarget!: HTMLElement;

  private events: { event: string; timestamp: number }[] = [];

  private obscureListItem(ev: AnimationEvent) {
    const item = ev.target as HTMLLIElement;
    item.classList.add('animated');
  }

  async addEvent(message: string) {
    this.events.push({ event: message, timestamp: Date.now() });
    this.requestUpdate();
    await this.updateComplete;
    requestAnimationFrame(() => this.scrollTarget.scrollIntoView());
  }

  render() {
    return html`
      <ol @animationend=${this.obscureListItem}>
        ${repeat(
          this.events,
          ({ timestamp }) => timestamp,
          ({ event }) => html` <li>${event}</li> `,
        )}
        <li class="scroll-target"></li>
      </ol>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'event-list': EventList;
  }
}
