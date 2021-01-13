import { MessageVisibility } from '@src/chat/create-message';
import { enumValues } from '@src/data-enums';
import { localize } from '@src/foundry/localization';
import { openMenu } from '@src/open-menu';
import {
  SuccessTestRollState,
  successTestTargetClamp,
} from '@src/success-test/success-test';
import { customElement, LitElement, property, html } from 'lit-element';
import styles from './success-test-footer.scss';

@customElement('success-test-footer')
export class SuccessTestFooter extends LitElement {
  static get is() {
    return 'success-test-footer' as const;
  }

  static get styles() {
    return [styles];
  }

  @property({ type: Number }) target = 0;

  @property({ type: Object }) rollState!: SuccessTestRollState & {
    update: (changed: Partial<SuccessTestRollState>) => void;
  };

  private emitCompleted() {
    this.dispatchEvent(
      new CustomEvent('test-completed', { bubbles: true, composed: true }),
    );
  }

  render() {
    const { target, rollState: state } = this;
    const clamped = successTestTargetClamp(target);

    return html`
      <div class="target">
        <span class="target-original" ?hidden=${clamped === target}
          >${target}</span
        >
        <span class="target-clamped">${clamped}</span>
        <span class="target-label">${localize('target')}</span>
      </div>
      <div class="settings">
        <button
          @click=${() =>
            openMenu({
              content: enumValues(MessageVisibility).map((option) => ({
                label: localize(option),
                callback: () => {
                  this.rollState.update({ visibility: option });
                },
                activated: option === state.visibility,
              })),
            })}
        >
          <span class="visibility">${localize(state.visibility)}</span>
          <mwc-icon>keyboard_arrow_down</mwc-icon>
        </button>

        <button @click=${() => state.update({ autoRoll: !state.autoRoll })}>
          <mwc-icon class="checkbox"
            >${state.autoRoll
              ? 'check_box'
              : 'check_box_outline_blank'}</mwc-icon
          >
          Auto Roll
        </button>
      </div>
      <mwc-button @click=${this.emitCompleted} raised
        >${localize('start')} ${localize('test')}</mwc-button
      >
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'success-test-footer': SuccessTestFooter;
  }
}
