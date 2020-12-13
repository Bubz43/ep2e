import {
  renderFormulaField,
  renderNumberField,
  renderTextField,
} from '@src/components/field/fields';
import { renderAutoForm } from '@src/components/form/forms';
import { localize } from '@src/foundry/localization';
import type { AppMeshHealth } from '@src/health/app-mesh-health';
import type { MeshHealth } from '@src/health/full-mesh-health';
import { createMeshDamage, MeshDamage } from '@src/health/health-changes';
import { customElement, html } from 'lit-element';
import { HealthEditBase } from '../health-edit-base';

@customElement('mesh-health-damage-editor')
export class MeshHealthDamageEditor extends HealthEditBase<
  AppMeshHealth | MeshHealth,
  MeshDamage
> {
  static get is() {
    return 'mesh-health-damage-editor' as const;
  }

  protected createEditable() {
    return createMeshDamage(this.damage || { damageValue: 0, formula: '' });
  }

  render() {
    return html`
      <div class="damage-settings">
        ${renderAutoForm({
          props: this.editableDamage,
          noDebounce: true,
          update: (changed, orig) =>
            (this.editableDamage = { ...orig, ...changed }),
          fields: ({ damageValue, source, formula }) => [
            renderTextField(source, { placeholder: localize('editor') }),
            renderFormulaField(formula),
            renderNumberField(
              { ...damageValue, label: localize('damage') },
              { min: 0 },
            ),
          ],
        })}
        ${this.armor ? html`<div class="armor-toggles">
          <mwc-button
            dense
            label=${localize('armorPiercing')}
            ?outlined=${!this.editableDamage.armorPiercing}
            ?unelevated=${this.editableDamage.armorPiercing}
            @click=${this.toggleArmorPiercing}
          ></mwc-button>
          <mwc-button
            ?outlined=${!this.editableDamage.reduceAVbyDV}
            ?unelevated=${this.editableDamage.reduceAVbyDV}
            dense
            label=${localize('reduceAVbyDV')}
            @click=${this.toggleArmorReduce}
          ></mwc-button>
        </div>` : ""}
      </div>

      ${this.renderCommon()}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'mesh-health-damage-editor': MeshHealthDamageEditor;
  }
}
