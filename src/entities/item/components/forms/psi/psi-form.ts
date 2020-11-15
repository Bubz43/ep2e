import {
  renderNumberField,
  renderLabeledCheckbox,
} from '@src/components/field/fields';
import { renderAutoForm, renderUpdaterForm } from '@src/components/form/forms';
import {
  closeWindow,
  openWindow,
} from '@src/components/window/window-controls';
import {
  ResizeOption,
  SlWindowEventName,
} from '@src/components/window/window-options';
import { entityFormCommonStyles } from '@src/entities/components/form-layout/entity-form-common-styles';
import { renderItemForm } from '@src/entities/item/item-views';
import type { Psi } from '@src/entities/item/proxies/psi';
import { matchID } from '@src/features/feature-helpers';
import { InfluenceRoll, PsiInfluenceType } from '@src/features/psi-influence';
import { localize } from '@src/foundry/localization';
import { customElement, html, property, PropertyValues } from 'lit-element';
import { ItemFormBase } from '../item-form-base';
import styles from './psi-form.scss';

@customElement('psi-form')
export class PsiForm extends ItemFormBase {
  static get is() {
    return 'psi-form' as const;
  }

  static styles = [entityFormCommonStyles, styles];

  @property({ attribute: false }) item!: Psi;

  private traitSheetKeys = new Map<InfluenceRoll, {}>();

  async connectedCallback() {
    if (!this.disabled && this.item.influencesData?.length !== 6) {
      await this.item.setupDefaultInfluences();
    }
    super.connectedCallback();
  }

  disconnectedCallback() {
    this.traitSheetKeys.forEach(closeWindow);
    this.traitSheetKeys.clear();
    super.disconnectedCallback();
  }

  update(changedProps: PropertyValues) {
    for (const [roll] of this.traitSheetKeys) {
      this.openItemSheet(roll);
    }
    super.update(changedProps);
  }

  private openItemSheet(roll: InfluenceRoll) {
    const influence = this.item.fullInfluences[roll];
    const { traitSheetKeys } = this;
    let key = traitSheetKeys.get(roll);
    if (!key) {
      key = {};
      traitSheetKeys.set(roll, key);
    }

    if (influence.type !== PsiInfluenceType.Trait) {
      closeWindow(key);
      traitSheetKeys.delete(roll);
      return;
    }

    const { wasConnected, win } = openWindow(
      {
        key: key,
        content: renderItemForm(influence.trait),
        adjacentEl: this,
        forceFocus: true,
        name: influence.trait.fullName,
      },
      { resizable: ResizeOption.Vertical },
    );
    if (!wasConnected) {
      win.addEventListener(
        SlWindowEventName.Closed,
        () => traitSheetKeys.delete(roll),
        { once: true },
      );
    }
  }

  render() {
    const { updater, type, hasVariableInfection } = this.item;
    const { disabled } = this;
    return html`
      <entity-form-layout noSidebar>
        <entity-form-header
          noDefaultImg
          slot="header"
          .updateActions=${updater.prop('')}
          type=${localize(type)}
          ?disabled=${disabled}
        >
        </entity-form-header>

        ${renderUpdaterForm(updater.prop('data'), {
          disabled,
          slot: 'sidebar',
          fields: () => [],
        })}

        <div slot="details">
          ${renderAutoForm({
            disabled,
            classes: 'primary-form',
            props: this.item.epData,
            update: ({ level, requireBioSubstrate }) => {
              if (level) this.item.updateLevel(level);
              else if (requireBioSubstrate !== undefined) {
                this.item.updater
                  .prop('data', 'requireBioSubstrate')
                  .commit(requireBioSubstrate);
              }
            },
            fields: ({ level, requireBioSubstrate }) => [
              renderNumberField(level, { min: 1, max: game.user.isGM ? 3 : 2 }),
              hasVariableInfection
                ? ''
                : renderLabeledCheckbox(requireBioSubstrate),
            ],
          })}
        </div>

        <editor-wrapper
          slot="description"
          ?disabled=${disabled}
          .updateActions=${updater.prop('data', 'description')}
        ></editor-wrapper>
        ${this.renderDrawerContent()}
      </entity-form-layout>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'psi-form': PsiForm;
  }
}
