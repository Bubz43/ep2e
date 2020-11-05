import {
  customElement,
  LitElement,
  property,
  html,
  TemplateResult,
} from 'lit-element';
import { render } from 'lit-html';
import { NanoPopPosition, reposition } from 'nanopop';
import { addListener } from 'weightless';
import styles from './tooltip.scss';

const leaveEvents = ['mouseleave', 'blur'];

@customElement('sl-tooltip')
export class ToolTip extends LitElement {
  static get is() {
    return 'sl-tooltip' as const;
  }

  static styles = [styles];

  @property({ type: Boolean, reflect: true }) visible = false;

  private listenerUnsub: (() => void) | null = null;

  firstUpdated() {
    this.addEventListener('mouseleave', () => this.detach(true));
  }

  fromData = ({ currentTarget: el }: Event) => {
    if (el instanceof HTMLElement && el.dataset.tooltip) {
      this.attach({
        el,
        content: el.dataset.tooltip,
        position: 'bottom-middle',
      });
    }
  };

  attach({
    el,
    content,
    position = 'top-start',
  }: {
    el: HTMLElement;
    content: TemplateResult | string;
    position?: NanoPopPosition;
  }) {
    if (this.listenerUnsub) this.detach(false);
    render(content, this);
    this.visible = true;
    requestAnimationFrame(() => reposition(el, this, { position, margin: 4 }));
    this.listenerUnsub = addListener(el, leaveEvents, () => this.detach(true));
  }

  detach(hide: boolean) {
    this.visible = !hide;
    this.listenerUnsub?.();
    this.listenerUnsub = null;
  }

  render() {
    return html` <slot></slot> `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'sl-tooltip': ToolTip;
  }
}
