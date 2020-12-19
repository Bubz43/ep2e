import { renderSlider } from '@src/components/field/fields';
import { renderAutoForm } from '@src/components/form/forms';
import { UseWorldTime } from '@src/components/mixins/world-time-mixin';
import {
  createLiveTimeState,
  currentWorldTimeMS,
  prettyMilliseconds,
  LiveTimeState,
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

/**
 * @slot action - only visible when not editing
 */
@customElement('character-view-time-item')
export class CharacterViewTimeItem extends UseWorldTime(LitElement) {
  static get is() {
    return 'character-view-time-item' as const;
  }

  static styles = [styles];

  @property({ attribute: false }) timeState!: LiveTimeState;

  @property({ type: Boolean }) disabled = false;

  @property({ type: String }) completion: 'ready' | 'expired' | 'completed' =
    'ready';

  @internalProperty() private editing = false;

  @internalProperty() private prog = 0;

  @internalProperty() private updatedState = false;

  update(changedProps: PropertyValues) {
    if (this.editing && changedProps.get('timeState') !== undefined) {
      this.prog = this.timeState.progress;
    }
    super.update(changedProps);
  }

  updated(changedProps: PropertyValues) {
    if (this.updatedState && changedProps.has('timeState')) {
      this.updatedState = false;
    }
    super.update(changedProps);
    const blah = new Intl.RelativeTimeFormat('en', { style: 'narrow' });
    blah.format(3, 'days');
  }

  private toggleEditing() {
    this.editing = !this.editing;
    if (this.editing) this.prog = this.timeState.progress;
    else this.applyProgress();
  }

  private discardChanges() {
    this.editing = false;
  }

  private applyProgress() {
    this.timeState.updateStartTime(
      currentWorldTimeMS() - this.timeState.duration * (this.prog / 100),
    );
    this.updatedState = true;
  }

  private get updatedStartTime() {
    return currentWorldTimeMS() - this.timeState.duration * (this.prog / 100);
  }

  private get activeTimeState() {
    return this.editing || this.updatedState
      ? createLiveTimeState({
          ...this.timeState,
          startTime: this.updatedStartTime,
        })
      : this.timeState;
  }

  render() {
    const { label, remaining, img } = this.activeTimeState;
    return html`
      ${img ? html` <img height="20px" src=${img} /> ` : ''}
      <span class="name"
        >${!remaining
          ? html`<span class=${this.completion}
              >[${localize(this.completion)}]</span
            >`
          : ''}
        ${label}
        ${remaining
          ? html`<span class="remaining"
              >${this.completion === 'ready' ? `${localize('readyIn')}` : ''}
              ${prettyMilliseconds(remaining)}
              ${this.completion !== 'ready' ? localize('remaining') : ''}</span
            >`
          : ''}
      </span>
      <div class="actions">
        <mwc-icon-button icon="${this.editing ? 'save' : 'edit'}" @click=${this.toggleEditing} ?disabled=${this.disabled}>
        </mwc-icon-button>
        ${this.editing
          ? html`<mwc-icon-button @click=${this.discardChanges} icon="clear">
            </mwc-icon-button>`
          : html` <slot name="action"></slot> `}
      </div>
      ${this.editing && !this.disabled
        ? this.renderProgressForm()
        : html`
            <mwc-linear-progress
              progress=${this.activeTimeState.progress / 100}
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
