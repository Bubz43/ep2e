import type { Trait } from '@src/entities/item/proxies/trait';
import {
  addUpdateRemoveFeature,
  StringID,
} from '@src/features/feature-helpers';
import { localize } from '@src/foundry/localization';
import { tooltip } from '@src/init';
import { openMenu } from '@src/open-menu';
import { customElement, LitElement, property, html } from 'lit-element';
import styles from './trait-form-level.scss';
import { UpdatedTraitLevelEvent } from './updated-trait-level-event';

type Level = StringID<Trait['levelInfo']>;

/**
 * @fires updated-trait-level
 */
@customElement('trait-form-level')
export class TraitFormLevel extends LitElement {
  static get is() {
    return 'trait-form-level' as const;
  }

  static styles = [styles];

  @property({ type: Object }) level!: Level;

  @property({ type: Number }) index!: number;

  @property({ type: Boolean }) showIndex = false;

  @property({ type: Boolean }) disabled = false;

  @property({ type: String }) costInfo!: string;

  private readonly effectOps = addUpdateRemoveFeature<Level['effects'][number]>(
    () => async (newValue) => {
      const newGoals =
        typeof newValue === 'function'
          ? newValue(this.level.effects)
          : newValue;
      this.emitUpdate({ effects: newGoals });
    },
  );

  private emitUpdate = (changed: Partial<Level>) => {
    this.dispatchEvent(
      new UpdatedTraitLevelEvent({ ...this.level, ...changed }),
    );
  };

  private get heading() {
    return `${
      this.showIndex ? `${localize('level')} ${this.index + 1}` : ''
    } ${localize('effects')}`;
  }

  private requestAddEffectForm() {
    this.dispatchEvent(
      new CustomEvent('request-add-effect-form', {
        bubbles: true,
        composed: true,
      }),
    );
  }

  private requestEffectImport() {
    this.dispatchEvent(
      new CustomEvent('request-effect-import', {
        bubbles: true,
        composed: true,
      }),
    );
  }

  render() {
    return html`
      <sl-header>
        <span slot="heading">${this.heading} ${this.renderCostInfo()}</span>
        ${this.index !== 0 && this.level.effects.length === 0
          ? html`
              <mwc-icon-button
                slot="action"
                icon="import_export"
                ?disabled=${this.disabled}
                @click=${this.requestEffectImport}
                data-ep-tooltip="${localize('copy')} ${localize(
                  'level',
                )} 1 ${localize('effects')} @ x${this.index + 1}"
                @mouseover=${tooltip.fromData}
              ></mwc-icon-button>
            `
          : ''}

        <mwc-icon-button
          ?disabled=${this.disabled}
          icon="add"
          slot="action"
          @click=${this.requestAddEffectForm}
          data-ep-tooltip="${localize('add')} ${localize('effect')}"
          @mouseover=${tooltip.fromData}
          @focus=${tooltip.fromData}
        ></mwc-icon-button>
      </sl-header>
      <item-form-effects-list
        .effects=${this.level.effects}
        .operations=${this.effectOps}
        ?disabled=${this.disabled}
      ></item-form-effects-list>
    `;
  }

  private renderCostInfo() {
    return html`<span class="cost-info"
      >(${this.costInfo}: ${this.level.cost})</span
    >`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'trait-form-level': TraitFormLevel;
  }
}
