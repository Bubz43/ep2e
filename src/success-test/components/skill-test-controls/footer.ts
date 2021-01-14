import { MessageVisibility } from "@src/chat/create-message";
import { enumValues } from "@src/data-enums";
import { localize } from "@src/foundry/localization";
import { openMenu } from "@src/open-menu";
import { SuccessTestSettings, successTestTargetClamp } from "@src/success-test/success-test";
import type { WithUpdate } from "@src/utility/updating";
import { customElement, LitElement, property, html } from "lit-element";
import styles from "./footer.scss";

@customElement('st-footer')
export class SkillTestFooter extends LitElement {
  static get is() {
    return 'st-footer' as const;
  }

  static get styles() {
    return [styles];
  }

  @property({ attribute: false }) settings!: WithUpdate<SuccessTestSettings>;

  @property({ type: Number }) target = 0;

  private emitCompleted() {
    this.dispatchEvent(
      new CustomEvent('test-completed', { bubbles: true, composed: true }),
    );
  }

  render() {
    const { target, settings } = this;
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
                  this.settings.update({ visibility: option });
                },
                activated: option === settings.visibility,
              })),
            })}
        >
          <span class="visibility">${localize(settings.visibility)}</span>
          <mwc-icon>keyboard_arrow_down</mwc-icon>
        </button>

        <button @click=${() => settings.update({ autoRoll: !settings.autoRoll })}>
          <mwc-icon class="checkbox"
            >${settings.autoRoll
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
        "st-footer": SkillTestFooter;
    }
}
