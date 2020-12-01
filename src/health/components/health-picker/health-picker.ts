import type { Damage } from '@src/combat/damages';
import { renderRadioFields } from '@src/components/field/fields';
import { renderAutoForm } from '@src/components/form/forms';
import { Placement } from '@src/components/popover/popover-options';
import {
  closeWindow,
  openWindow,
} from '@src/components/window/window-controls';
import { enumValues } from '@src/data-enums';
import type { ActorEP } from '@src/entities/actor/actor';
import { ActorType } from '@src/entities/entity-types';
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
import { compact } from 'remeda';
import styles from './health-picker.scss';

@customElement('health-picker')
export class HealthPicker extends LitElement {
  static get is() {
    return 'health-picker' as const;
  }

  static styles = [styles];

  static openWindow(actor: ActorEP, adjacentEl?: HTMLElement) {
    return openWindow({
      key: HealthPicker,
      name: `${localize('health')} ${localize('picker')}`,
      content: html` <health-picker .actor=${actor}></health-picker> `,
      adjacentEl,
      forceFocus: true,
    });
  }

  @property({ attribute: false }) actor!: ActorEP;

  @property({ type: Object }) change?: Damage;

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
    if (changedProps.has('change') && this.change) {
      this.healthType = this.change.type;
    }
    super.update(changedProps);
  }

  private cleanupSub() {
    this.actorUnsub?.();
    this.actorUnsub = null;
    this.selectedHealth = null;
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
      <mwc-list-item graphic="medium" noninteractive twoline>
        <img slot="graphic" src=${img} />
        <span>${name}</span>
        <span slot="secondary"
          >${compact([
            localize(this.actor.type),
            this.actor.proxy.type === ActorType.Character &&
            this.actor.proxy.sleeve
              ? localize(this.actor.proxy.sleeve.type)
              : '',
          ]).join(' / ')}</span
        >
      </mwc-list-item>

      <mwc-tab-bar>
        ${enumValues(HealthType).map(
          (type) => html`
            <mwc-tab
              isFadingIndicator
              label=${localize(type)}
              @click=${() => (this.healthType = type)}
            ></mwc-tab>
          `,
        )}
      </mwc-tab-bar>

      ${currentHealth
        ? html` <sl-popover
              placement=${Placement.Left}
              .renderOnDemand=${() => html`
                <ul class="healths">
                  ${filteredHealths.map(
                    (health) => html`
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
              <health-item
                slot="base"
                .health=${currentHealth}
                clickable
              ></health-item>
            </sl-popover>

            ${renderAutoForm({
              props: { mode: this.mode },
              update: ({ mode }) => mode && (this.mode = mode),
              fields: ({ mode }) => [renderRadioFields(mode, ['heal', 'harm'])],
            })}`
        : html`
            <p>
              ${localize('no')} ${localize(this.healthType)}
              ${localize('health')}
            </p>
          `}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'health-picker': HealthPicker;
  }
}
