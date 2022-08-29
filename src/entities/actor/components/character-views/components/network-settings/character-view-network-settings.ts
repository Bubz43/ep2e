import { renderSelectField } from '@src/components/field/fields';
import { renderUpdaterForm } from '@src/components/form/forms';
import { DeviceType } from '@src/data-enums';
import type { Character } from '@src/entities/actor/proxies/character';
import { localize } from '@src/foundry/localization';
import { customElement, LitElement, property, html } from 'lit-element';
import { compact, flatMapToObj, mapToObj } from 'remeda';
import styles from './character-view-network-settings.scss';

@customElement('character-view-network-settings')
export class CharacterViewNetworkSettings extends LitElement {
  static get is() {
    return 'character-view-network-settings' as const;
  }

  static styles = [styles];

  @property({ attribute: false }) character!: Character;

  private toggleUnslaved(id: string) {
    this.character.updater
      .path('system', 'network', 'unslavedDevices')
      .commit((ids) => {
        const unslaved = new Set(ids);
        if (unslaved.has(id)) unslaved.delete(id);
        else unslaved.add(id);
        return [...unslaved];
      });
  }

  render() {
    const { updater, disabled, equippedGroups } = this.character;
    const { devices, masterDevice } = equippedGroups;
    const nonMasterDevices = mapToObj(
      compact([masterDevice, ...devices.keys()]),
      (device) => [device.id, device.name],
    );
    return html`
      <character-view-drawer-heading
        >${localize('network')}
        ${localize('settings')}</character-view-drawer-heading
      >

      ${renderUpdaterForm(updater.path('system', 'network'), {
        disabled,
        fields: ({ masterDeviceId }) =>
          renderSelectField(
            { ...masterDeviceId, label: localize('masterDevice') },
            Object.keys(nonMasterDevices),
            { emptyText: '-', altLabel: (id) => nonMasterDevices[id] || id },
          ),
      })}
      ${masterDevice
        ? html`<mwc-list multi>
            <li class="devices-header">
              <span>${localize('devices')}</span>
              <span>${localize('slaved')}</span>
            </li>
            <li divider></li>
            ${[...devices].map(
              ([device, slaved]) =>
                html`
                  <mwc-check-list-item
                    ?selected=${slaved}
                    @click=${() => this.toggleUnslaved(device.id)}
                    >${device.fullName}</mwc-check-list-item
                  >
                `,
            )}
          </mwc-list> `
        : ''}
      <section>
        <sl-header heading=${localize('accountShells')}></sl-header>
        // TODO
      </section>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'character-view-network-settings': CharacterViewNetworkSettings;
  }
}
