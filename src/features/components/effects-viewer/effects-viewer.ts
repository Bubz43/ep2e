import { enumValues } from '@src/data-enums';
import type { ReadonlyAppliedEffects } from '@src/entities/applied-effects';
import { EffectType, Source, formatEffect } from '@src/features/effects';
import { localize } from '@src/foundry/localization';
import { listOrEmptyString, notEmpty } from '@src/utility/helpers';
import { customElement, LitElement, property, html } from 'lit-element';
import styles from './effects-viewer.scss';

@customElement('effects-viewer')
export class EffectsViewer extends LitElement {
  static get is() {
    return 'effects-viewer' as const;
  }

  static styles = [styles];

  @property({ attribute: false }) effects!: ReadonlyAppliedEffects;

  render() {
    return html`
      <character-view-drawer-heading>${localize("effects")}</character-view-drawer-heading>
      ${enumValues(EffectType).map(this.renderEffectTypes)}
    `;
  }

  private renderEffectTypes = (type: EffectType) => {
    const group = this.effects.getGroup(type);
    return notEmpty(group)
      ? html`
          <sl-details endArrow>
            <span slot="summary"
              >${localize(type)}
              <span class="summary-value">${group.length}</span></span
            >
            <ul>
              ${group.map(
                (effect) => html`
                  <li>
                    <span class="effect-source"> ${effect[Source]} </span>

                    <span class="effect-effects">
                      ${formatEffect(effect)}
                    </span>
                  </li>
                `,
              )}
            </ul>
          </sl-details>
        `
      : '';
  };
}

declare global {
  interface HTMLElementTagNameMap {
    'effects-viewer': EffectsViewer;
  }
}
