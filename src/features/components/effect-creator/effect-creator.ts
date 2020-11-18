import { renderSelectField } from '@src/components/field/fields';
import { FormHandlers, renderAutoForm } from '@src/components/form/forms';
import { enumValues } from '@src/data-enums';
import { createEffect, EffectType } from '@src/features/effects';
import { createTag } from '@src/features/tags';
import { localize } from '@src/foundry/localization';
import { LazyGetter } from 'lazy-get-decorator';
import {
  customElement,
  LitElement,
  property,
  html,
  internalProperty,
} from 'lit-element';
import { difference } from 'remeda';
import type { EffectUpdatedEvent } from '../effect-editor/effect-updated-event';
import { EffectCreatedEvent } from './effect-created-event';
import styles from './effect-creator.scss';

/**
 * @fires effect-created
 */
@customElement('effect-creator')
export class EffectCreator extends LitElement {
  static get is() {
    return 'effect-creator' as const;
  }

  static styles = [styles];

  @LazyGetter()
  static get defaultEffectTypes() {
    return difference(enumValues(EffectType), [EffectType.Armor]);
  }

  @property({ type: Array }) effectTypes = EffectCreator.defaultEffectTypes;

  @internalProperty() effectType!: EffectType;

  connectedCallback() {
    this.effectType = this.effectTypes[0];
    super.connectedCallback();
  }

  private emitCreated(ev: EffectUpdatedEvent) {
    this.dispatchEvent(new EffectCreatedEvent(ev.effect));
    this.requestUpdate();
  }

  private newEffect() {
    return this.effectType === EffectType.SuccessTest
      ? createEffect.successTest({ tags: [createTag.allActions({})] })
      : createEffect[this.effectType]({});
  }

  private typeFormHandlers: FormHandlers<{ type: EffectType }> = {
    update: ({ type }) => type && (this.effectType = type),
    fields: ({ type }) =>
      renderSelectField(
        { ...type, label: localize('effectType') },
        enumValues(EffectType),
      ),
  };

  render() {
    return html`
      ${renderAutoForm({
        noDebounce: true,
        props: { type: this.effectType },
        ...this.typeFormHandlers,
      })}
      <effect-editor
        .effect=${this.newEffect()}
        @effect-updated=${this.emitCreated}
      ></effect-editor>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'effect-creator': EffectCreator;
  }
}
