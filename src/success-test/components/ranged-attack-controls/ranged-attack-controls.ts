import { customElement, LitElement } from 'lit-element';
import styles from './ranged-attack-controls.scss';

@customElement('ranged-attack-controls')
export class RangedAttackControls extends LitElement {
  static get is() {
    return 'ranged-attack-controls' as const;
  }

  static get styles() {
    return [styles];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ranged-attack-controls': RangedAttackControls;
  }
}
