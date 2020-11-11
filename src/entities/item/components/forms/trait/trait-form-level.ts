import type { Trait } from '@src/entities/item/proxies/trait';
import {
  addUpdateRemoveFeature,
  StringID,
} from '@src/features/feature-helpers';
import { localize } from '@src/foundry/localization';
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
      this.showIndex
        ? `${localize('level')} ${this.index + 1}`
        : ''
    } ${localize('effects')}`;
  }

  private renderCostInfo() {
    return html`<span class="cost-info">(${this.costInfo}: ${this.level.cost})</span>`
  }
  render() {
    return html`
      <sl-header>
      <span slot="heading">${this.heading} ${this.renderCostInfo()}</span>
      </sl-header>
      <item-form-effects-list
        .effects=${this.level.effects}
        .operations=${this.effectOps}
        ?disabled=${this.disabled}
      ></item-form-effects-list>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'trait-form-level': TraitFormLevel;
  }
}
