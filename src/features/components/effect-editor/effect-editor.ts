import type { Form } from '@src/components/form/form';
import { renderAutoForm } from '@src/components/form/forms';
import { Origin } from '@src/components/popover/popover-options';
import type { SubmitButton } from '@src/components/submit-button/submit-button';
import { createEffect, Effect, EffectType } from '@src/features/effects';
import type { StringID } from '@src/features/feature-helpers';
import { formatTag, Tag } from '@src/features/tags';
import { localize } from '@src/foundry/localization';
import { notEmpty } from '@src/utility/helpers';
import type { PropertyValues } from 'lit-element';
import {
  customElement,
  LitElement,
  property,
  html,
  internalProperty,
  query,
} from 'lit-element';
import { repeat } from 'lit-html/directives/repeat';
import { identity, uniqBy } from 'remeda';
import type { TagUpdatedEvent } from '../tag-editor/tag-updated-event';
import styles from './effect-editor.scss';
import { effectFields } from './effect-fields';
import { EffectUpdatedEvent } from './effect-updated-event';

/**
 * @fires effect-updated
 */
@customElement('effect-editor')
export class EffectEditor extends LitElement {
  static get is() {
    return 'effect-editor' as const;
  }

  static styles = [styles];

  @property({ type: Object }) effect!: Effect | StringID<Effect>;

  @internalProperty() internalEffect!: Required<Effect>;

  @query('sl-form')
  form!: Form;

  @query('submit-button')
  submitButton!: SubmitButton;

  update(changedProps: PropertyValues) {
    if (changedProps.has('effect')) {
      this.internalEffect = createEffect[this.effect.type](
        duplicate(this.effect) as any,
      );
    }
    super.update(changedProps);
  }

  firstUpdated() {
    this.addEventListener(
      'keydown',
      (ev) => ev.key === 'Enter' && this.submitButton.click(),
      { capture: true },
    );
  }

  updated() {
    requestAnimationFrame(() => {
      this.submitButton.complete = this.isComplete(false);
    });
  }

  private isComplete(report: boolean) {
    return (
      this.form.isComplete({ report }) &&
      (this.internalEffect.type !== EffectType.SuccessTest ||
        notEmpty(this.internalEffect.tags))
    );
  }

  private finalizedEffect() {
    const { internalEffect } = this;
    return internalEffect.type === EffectType.SuccessTest
      ? {
          ...internalEffect,
          tags: uniqBy(internalEffect.tags, JSON.stringify),
        }
      : internalEffect;
  }

  private updateTags(ev: TagUpdatedEvent) {
    ev.stopPropagation();
    if (this.internalEffect.type === EffectType.SuccessTest) {
      const { tags } = this.internalEffect;
      this.internalEffect = {
        ...this.internalEffect,
        tags: tags.concat(ev.tag),
      };
    }
  }

  private removeTag(index: number) {
    if (this.internalEffect.type === EffectType.SuccessTest) {
      const { tags } = this.internalEffect;
      tags.splice(index, 1);
      this.internalEffect = { ...this.internalEffect, tags };
    }
  }

  private emitUpdate(ev: Event) {
    ev.stopPropagation();
    if (this.isComplete(true)) {
      this.dispatchEvent(new EffectUpdatedEvent(this.finalizedEffect()));
    }
  }

  private updateInternal = (changed: Partial<Effect>) => {
    const initial = { ...this.internalEffect, ...changed };
    this.internalEffect = createEffect[initial.type](initial as any);
  };

  render() {
    const { internalEffect } = this;
    return html`
      ${internalEffect.type === EffectType.SuccessTest
        ? html`
            <header class="tags-header">
              <h4>${localize('match')} ${localize('tags')}</h4>
              <sl-popover
                .renderOnDemand=${this.renderTagEditor}
                .closeEvents=${['tag-updated']}
                origin=${Origin.Inset}
                @tag-updated=${this.updateTags}
              >
                <mwc-button
                  dense
                  icon="add"
                  label=${localize('add')}
                  trailingIcon
                  slot="base"
                ></mwc-button>
              </sl-popover>
            </header>

            <sl-animated-list class="chips">
              ${repeat(internalEffect.tags, identity, this.renderChip)}
            </sl-animated-list>
          `
        : ''}
      ${renderAutoForm({
        noDebounce: true,
        classes: `fields-form ${internalEffect.type}`,
        props: internalEffect,
        update: this.updateInternal,
        fields: effectFields,
      })}

      <submit-button
        @submit-attempt=${this.emitUpdate}
        label="${localize('save')} ${localize('effect')}"
      ></submit-button>
    `;
  }

  private renderTagEditor = () => html` <sl-popover-section
    heading="${localize('add')} ${localize('tag')}"
  >
    <tag-editor @tag-updater=${this.updateTags}></tag-editor
  ></sl-popover-section>`;

  private renderChip = (tag: Tag, index: number) => html`
    <wl-list-item class="chip">
      ${formatTag(tag)}
      <mwc-icon-button
        slot="after"
        icon="cancel"
        @click=${() => this.removeTag(index)}
      ></mwc-icon-button>
    </wl-list-item>
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    'effect-editor': EffectEditor;
  }
}
