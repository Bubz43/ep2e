import type { Damage } from '@src/combat/damages';
import { renderRadioFields } from '@src/components/field/fields';
import { renderAutoForm } from '@src/components/form/forms';
import {
  closeWindow,
  openWindow,
} from '@src/components/window/window-controls';
import { enumValues } from '@src/data-enums';
import type { ActorEP } from '@src/entities/actor/actor';
import { localize } from '@src/foundry/localization';
import { HealthType } from '@src/health/health';
import type { ActorHealth, Health } from '@src/health/health-mixin';
import {
  customElement,
  LitElement,
  property,
  html,
  PropertyValues,
  internalProperty,
} from 'lit-element';
import styles from './health-picker.scss';

@customElement('health-picker')
export class HealthPicker extends LitElement {
  static get is() {
    return 'health-picker' as const;
  }

  static styles = [styles];

  static openWindow(actor: ActorEP) {
    return openWindow({
      key: HealthPicker,
      name: `${localize('health')} ${localize('picker')}`,
      content: html` <health-picker .actor=${actor}></health-picker> `,
    });
  }

  @property({ attribute: false }) actor!: ActorEP;

  @property({ type: Object }) damage?: Damage;

  @internalProperty() healthType = HealthType.Physical;

  @internalProperty() mode: 'heal' | 'harm' = 'heal';

  @internalProperty() private selectedHealth: ActorHealth | null = null;

  private actorUnsub: (() => void) | null = null;

  disconnectedCallback() {
    this.cleanupSub();
    super.disconnectedCallback();
  }

  update(changedProps: PropertyValues) {
    if (changedProps.has('actor')) {
      this.cleanupSub();
      this.actor.subscriptions.subscribe(this, {
        onEntityUpdate: () => this.requestUpdate(),
        onSubEnd: () => closeWindow(HealthPicker),
      });
    }
    super.update(changedProps);
  }

  private cleanupSub() {
    this.actorUnsub?.();
    this.actorUnsub = null;
  }

  private get filteredHealths() {
    return this.actor.proxy.healths.filter(
      ({ type }) => type === this.healthType,
    );
  }

  render() {
    const { filteredHealths } = this;
    const currentHealth =
      (this.selectedHealth &&
        filteredHealths.includes(this.selectedHealth) &&
        this.selectedHealth) ||
      filteredHealths[0];
    const { name, img } = this.actor.tokenOrLocalInfo;
    return html`
      <mwc-list-item graphic="medium" noninteractive>
        <img slot="graphic" src=${img} />
        <span>${name}</span>
      </mwc-list-item>

      <mwc-tab-bar>
        ${enumValues(HealthType).map(
          (type) => html`
            <mwc-tab
              label=${localize(type)}
              @click=${() => (this.healthType = type)}
            ></mwc-tab>
          `,
        )}
      </mwc-tab-bar>

      <sl-popover
        .renderOnDemand=${() => html`
          <ul class="healths">
            ${filteredHealths.map(
              (health) =>  html`
                <health-item
                  .health=${health}
                  clickable
                  @click=${() => (this.selectedHealth = health)}
                ></health-item>
              `,
            )}
          </ul>
        `}
      >
        ${currentHealth
          ? html`
              <health-item
                slot="base"
                .health=${currentHealth}
                clickable
              ></health-item>
            `
          : html`
              <mwc-button slot="base"
                >${localize('select')} ${localize('health')}</mwc-button
              >
            `}
      </sl-popover>

      ${renderAutoForm({
        props: { mode: this.mode },
        update: ({ mode }) => mode && (this.mode = mode),
        fields: ({ mode }) => [renderRadioFields(mode, ['heal', 'harm'])],
      })}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'health-picker': HealthPicker;
  }
}
