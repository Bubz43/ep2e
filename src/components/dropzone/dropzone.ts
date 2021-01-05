import { dragSource, Drop } from '@src/foundry/drag-and-drop';
import {
  customElement,
  LitElement,
  property,
  html,
  internalProperty,
} from 'lit-element';
import mix from 'mix-with/lib';
import { LazyRipple } from '../mixins/lazy-ripple';
import styles from './dropzone.scss';

const dragEvents = ['dragleave', 'dragend', 'drop'] as const;

@customElement('sl-dropzone')
export class DropZone extends mix(LitElement).with(LazyRipple) {
  static get is() {
    return 'sl-dropzone' as const;
  }

  static styles = [styles];

  private static _highlighted: DropZone | null = null;

  private static set highlighted(cell: DropZone | null) {
    const { _highlighted } = DropZone;
    if (_highlighted === cell) return;
    _highlighted?.removeAttribute('outlined');
    cell?.setAttribute('outlined', '');
    DropZone._highlighted = cell;
  }

  @property({ type: Boolean }) disabled = false;

  private internalDrag = false;

  connectedCallback() {
    window.addEventListener('dragstart', this.setReady);
    window.addEventListener('dragend', this.removeReady);
    super.connectedCallback();
  }

  disconnectCallback() {
    window.removeEventListener('dragstart', this.setReady);
    window.removeEventListener('dragend', this.removeReady);
    super.disconnectedCallback();
  }

  firstUpdated() {
    this.addEventListener('dragover', this.setOutline);
    this.addEventListener('dragenter', this.setOutline);
    this.addEventListener('dragstart', () => {
      this.internalDrag = true;
      this.addEventListener('dragend', () => (this.internalDrag = false), {
        once: true,
      });
    });
    for (const event of dragEvents) {
      this.addEventListener(event, this.removeBackgroundHighlight);
    }
  }

  private readonly setReady = () => {
    if (!this.disabled && !this.internalDrag && dragSource().element)
      this.setAttribute('ready', '');
  };

  private readonly removeReady = () => this.removeAttribute('ready');

  private setOutline = () => {
    if (this.disabled || this.internalDrag) return;
    DropZone.highlighted = this;
  };

  private removeBackgroundHighlight = (ev: DragEvent) => {
    if (ev.type === 'dragleave' && ev.target !== this) return;
    if (ev.type === 'drop' && this.hasAttribute('outlined')) {
      const { position } = this.style;
      this.style.position = 'relative';
      if (ev.defaultPrevented) {
        this.style.setProperty('--mdc-ripple-color', 'var(--color-negative)');
      }
      this.rippleHandlers.startPress(ev);
      requestAnimationFrame(() => {
        this.rippleHandlers.endPress();
        setTimeout(() => {
          DropZone.highlighted = null;
          this.style.position = position;
          this.style.setProperty('--mdc-ripple-color', null);
        }, 500);
      });
    } else DropZone.highlighted = null;
  };

  render() {
    return html` <slot></slot> ${this.renderRipple(this.disabled)}`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'sl-dropzone': DropZone;
  }
}
