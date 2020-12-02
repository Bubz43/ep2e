import { renderSlider } from '@src/components/field/fields';
import { renderAutoForm } from '@src/components/form/forms';
import { UseWorldTime } from '@src/components/mixins/world-time-mixin';
import type { PhysicalTech } from '@src/entities/item/proxies/physical-tech';
import { currentWorldTimeMS, prettyMilliseconds } from '@src/features/time';
import { localize } from '@src/foundry/localization';
import {
  customElement,
  LitElement,
  property,
  html,
  internalProperty,
  PropertyValues,
} from 'lit-element';
import styles from './item-card-fabber.scss';

@customElement('item-card-fabber')
export class ItemCardFabber extends UseWorldTime(LitElement) {
  static get is() {
    return 'item-card-fabber' as const;
  }

  static styles = [styles];

  @property({ attribute: false }) fabber!: PhysicalTech;

  @internalProperty() private editing = false;

  @internalProperty() private prog = 0;

  update(changedProps: PropertyValues) {
    if (this.editing && changedProps.get('fabber') !== undefined) {
      this.prog = this.fabber.printState.progress;
    }
    super.update(changedProps);
  }

  private toggleEditing() {
    this.editing = !this.editing;
    if (this.editing) this.prog = this.fabber.printState.progress;
    else this.applyProgress();
  }

  private discardChanges() {
    this.editing = false;
  }

  private applyProgress() {
    this.fabber.updater
      .prop('data', 'state', 'fabStartTime')
      .commit(
        currentWorldTimeMS() -
          this.fabber.printState.duration * (this.prog / 100),
      );
  }

  render() {
    const { fabricatedItem, printState } = this.fabber;

    return html`
      ${fabricatedItem?.nonDefaultImg
        ? html` <img height="20px" src=${fabricatedItem.nonDefaultImg} /> `
        : ''}
      <span class="name"
        >${fabricatedItem
          ? html`${fabricatedItem.name}
              <span class="nested-type">${fabricatedItem.fullType}</span>`
          : `--${localize('available')}--`}</span
      >

      ${fabricatedItem
        ? html`
            <div class="actions">
              <button @click=${this.toggleEditing}>
                <mwc-icon>${this.editing ? 'save' : 'edit'}</mwc-icon>
              </button>
              ${this.editing
                ? html`<button @click=${this.discardChanges}>
                    <mwc-icon>clear</mwc-icon>
                  </button>`
                : ''}
            </div>
            ${this.editing
              ? this.renderProgressForm()
              : html`
                  <mwc-linear-progress
                    progress=${printState.progress / 100}
                  ></mwc-linear-progress>
                `}
          `
        : ''}
    `;
  }

  private renderProgressForm() {
    return renderAutoForm({
      props: { progress: this.prog },
      update: ({ progress = 0 }) => (this.prog = progress),
      fields: ({ progress }) =>
        renderSlider(progress, {
          min: 0,
          max: 100,
          step: 1,
          pin: true,
        }),
    });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'item-card-fabber': ItemCardFabber;
  }
}
