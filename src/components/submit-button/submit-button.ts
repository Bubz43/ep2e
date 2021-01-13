import { ButtonBase } from '@material/mwc-button/mwc-button-base';
import { style as buttonStyles } from '@material/mwc-button/styles-css';
import { customElement, LitElement, property, html } from 'lit-element';
import { stopEvent } from 'weightless';
import styles from './submit-button.scss';

const anim = [
  { transform: 'translateX(0)' },
  { transform: 'translateX(-6px) rotateY(-9deg)', offset: 0.265 },
  { transform: 'translateX(5px) rotateY(7deg)', offset: 0.485 },
  { transform: 'translateX(-3px) rotateY(-5deg)', offset: 0.615 },
  { transform: 'translateX(2px) rotateY(3deg)', offset: 0.835 },
  { transform: 'translateX(0px)' },
];

@customElement('submit-button')
export class SubmitButton extends ButtonBase {
  static get is() {
    return 'submit-button' as const;
  }

  static styles = [buttonStyles, styles];

  @property({ type: Boolean, reflect: true }) complete = false;

  @property({ type: Boolean, reflect: true }) raised = true;

  @property({ type: String }) icon = 'save_alt';

  @property({ type: String })  label = "";

  firstUpdated() {
    this.addEventListener('click', (ev) => this.animateSubmit(ev));
  }

  animateSubmit(ev: Event) {
    stopEvent(ev);
    const { complete } = this;
    this.style.pointerEvents = 'none';
    if (!complete) {
      this.animate(anim, { duration: 300, easing: 'ease-in-out' });
    } else {
      this.animate(
        { transform: [1, 0.5, 1].map((s) => `scale(${s})`) },
        { duration: 300, easing: 'ease-in-out' },
      );
    }

    setTimeout(() => {
      if (complete) this.icon = 'done_outline';
      else this.icon = 'error_outline';
      setTimeout(() => {
        this.dispatchEvent(
          new CustomEvent('submit-attempt', { bubbles: true, composed: true }),
        );
        setTimeout(() => {
          this.icon = 'save_alt';
          this.style.pointerEvents = '';
        }, 250);
      }, 300);
    }, 100);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'submit-button': SubmitButton;
  }
}
