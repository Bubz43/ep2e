import { renderSlider } from '@src/components/field/fields';
import { renderAutoForm } from '@src/components/form/forms';
import { UseWorldTime } from '@src/components/mixins/world-time-mixin';
import {
  createRefreshTimer,
  currentWorldTimeMS,
  prettyMilliseconds,
  RefreshTimer,
} from '@src/features/time';
import { localize } from '@src/foundry/localization';
import {
  customElement,
  LitElement,
  property,
  html,
  internalProperty,
  PropertyValues,
} from 'lit-element';
import styles from './character-view-time-item.scss';

@customElement('character-view-time-item')
export class CharacterViewTimeItem extends UseWorldTime(LitElement) {
  static get is() {
    return 'character-view-time-item' as const;
  }

  static styles = [styles];

  @property({ attribute: false }) timer!: RefreshTimer;

  @property({ type: Boolean }) disabled = false;

  @internalProperty() private editing = false;

  @internalProperty() private prog = 0;

  update(changedProps: PropertyValues) {
    if (this.editing && changedProps.get('timer') !== undefined) {
      this.prog = this.timer.progress;
    }
    super.update(changedProps);
  }

  private toggleEditing() {
    this.editing = !this.editing;
    if (this.editing) this.prog = this.timer.progress;
    else this.applyProgress();
  }

  private discardChanges() {
    this.editing = false;
  }

  private applyProgress() {
    this.timer.updateStartTime(
      currentWorldTimeMS() - this.timer.max * (this.prog / 100),
    );
  }

  private get updatedStartTime() {
    return currentWorldTimeMS() - this.timer.max * (this.prog / 100);
  }

  private get activeTimer() {
    return this.editing
      ? createRefreshTimer({ ...this.timer, startTime: this.updatedStartTime })
      : this.timer;
  }

  render() {
    const { label, remaining, img } = this.activeTimer;
    return html`
      ${img ? html` <img height="20px" src=${img} /> ` : ''}
      <span class="name"
        >${!remaining
          ? html`<span class="ready">[${localize('ready')}]</span>`
          : ''}
        ${label}
        ${remaining
          ? html`<span class="remaining"
              >${prettyMilliseconds(remaining)} ${localize('remaining')}</span
            >`
          : ''}
      </span>
      <div class="actions">
        <button @click=${this.toggleEditing} ?disabled=${this.disabled}>
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
              progress=${this.timer.progress / 100}
            ></mwc-linear-progress>
          `}
    `;
  }

  private renderProgressForm() {
    return renderAutoForm({
      props: { progress: this.prog },
      storeOnInput: true,
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
    'character-view-time-item': CharacterViewTimeItem;
  }
}
