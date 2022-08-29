import type { Firearm } from '@src/entities/item/proxies/firearm';
import type { FirearmAmmo } from '@src/entities/item/proxies/firearm-ammo';
import { localize } from '@src/foundry/localization';
import type { PropertyValues } from 'lit-element';
import { customElement, html, LitElement, property, state } from 'lit-element';
import { equals } from 'remeda';
import styles from './firearm-ammo-transformer.scss';

@customElement('firearm-ammo-transformer')
export class FirearmAmmoTransformer extends LitElement {
  static get is() {
    return 'firearm-ammo-transformer' as const;
  }

  static styles = [styles];

  @property({ attribute: false }) ammo!: FirearmAmmo;

  @property({ attribute: false }) firearm!: Firearm;

  @property({ type: Boolean, reflect: true }) overflowAmmo = false;

  @state() private modeStates: number[] = [];

  @state() private dragIndex: number | null = null;

  private dragState: number[] = [];

  update(changedProps: PropertyValues<this>) {
    if (changedProps.has('firearm')) {
      this.copyState();
    }
    super.update(changedProps);
  }

  private copyState() {
    this.modeStates = [...this.firearm.ammoData.modeSettings];
  }

  private updateFirearmForms() {
    if (!equals(this.modeStates, this.firearm.ammoData.modeSettings)) {
      this.firearm.updater
        .path('system', 'ammo', 'modeSettings')
        .commit(this.modeStates);
    }
  }

  private setAll(index: number) {
    this.modeStates = Array(this.modeStates.length).fill(index);
  }

  private setState(ammoIndex: number, formIndex: number) {
    const current = this.modeStates[ammoIndex];
    if (current !== formIndex) {
      this.modeStates[ammoIndex] = formIndex;
      this.requestUpdate();
    }
  }

  private setStateAndDrag(ammoIndex: number, formIndex: number) {
    this.dragState = [...this.modeStates];
    this.setState(ammoIndex, formIndex);
    this.dragIndex = formIndex;

    window.addEventListener('mouseup', () => (this.dragIndex = null), {
      once: true,
    });
  }

  render() {
    const { modeStates } = this;
    const { modes } = this.ammo;
    const changed = !equals(
      this.modeStates,
      this.firearm.ammoData.modeSettings,
    );
    const { ammoCapacity } = this.firearm;
    return html`
      <ol class="ammo-forms" style="--columns: ${modes.length}">
        ${modes.map(
          (form, index) => html`
            <wl-list-item clickable @click=${() => this.setAll(index)}>
              ${form.name}
            </wl-list-item>
          `,
        )}
      </ol>
      <ol class="weapon-forms" style="--columns: ${modes.length}">
        ${Array.from({ length: ammoCapacity }, (_, ammoIndex) => {
          const label =
            ammoIndex % 10
              ? ''
              : html`
                  <span class="label"
                    >${ammoIndex + 1} -
                    ${Math.min(ammoIndex + 10, ammoCapacity)}</span
                  >
                `;

          if (modeStates[ammoIndex] === undefined) {
            return html`
              <li>
                ${label}
                <div class="empty-ammo"></div>
              </li>
            `;
          }
          const form = modeStates[ammoIndex];
          return html`
            <li>
              ${label}
              <ol class="ammo-form">
                ${modes.map((_, index) => {
                  const active = index === form;
                  return html`
                    <wl-list-item
                      ?clickable=${!active}
                      @mousedown=${() => this.setStateAndDrag(ammoIndex, index)}
                      @mouseenter=${() => {
                        if (this.dragIndex !== null) {
                          this.setState(ammoIndex, this.dragIndex);
                        }
                      }}
                      class=${active ? 'active' : ''}
                    ></wl-list-item>
                  `;
                })}
              </ol>
            </li>
          `;
        })}
      </ol>

      <footer class="buttons">
        <mwc-button
          outlined
          icon="undo"
          label=${localize('initial')}
          ?disabled=${!changed}
          @click=${this.copyState}
        ></mwc-button>
        <submit-button
          label=${localize('save')}
          @submit-attempt=${this.updateFirearmForms}
          ?complete=${changed}
        ></submit-button>
      </footer>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'firearm-ammo-transformer': FirearmAmmoTransformer;
  }
}
