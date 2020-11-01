import { customElement, LitElement, property, html } from 'lit-element';
import styles from './dropzone.scss';

const dragEvents = ['dragleave', 'dragend', 'drop'] as const;

@customElement('sl-dropzone')
export class DropZone extends LitElement {
  static get is() {
    return 'sl-dropzone' as const;
  }

  static styles = [styles];

  private static _highlighted: DropZone | null = null;

  private static set highlighted(cell: DropZone | null) {
    const { _highlighted } = DropZone;
    if (_highlighted === cell) return;
    _highlighted?.style.setProperty('--drag-bg', null);
    cell?.style.setProperty('--drag-bg', 'var(--color-secondary)');
    DropZone._highlighted = cell;
  }

  firstUpdated() {
    this.addEventListener('dragover', () => this.highlightBackground());
    for (const event of dragEvents) {
      this.addEventListener(event, this.removeBackgroundHighlight);
    }
  }

  private highlightBackground() {
    DropZone.highlighted = this;
  }

  private removeBackgroundHighlight = () => (DropZone.highlighted = null);

  render() {
    return html` <slot></slot> `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'sl-dropzone': DropZone;
  }
}
