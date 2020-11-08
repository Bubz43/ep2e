import type { Form } from "@src/components/form/form";
import type { SubmitButton } from "@src/components/submit-button/submit-button";
import { Effect, EffectType } from "@src/features/effects";
import type { StringID } from "@src/features/feature-helpers";
import { notEmpty } from "@src/utility/helpers";
import type { PropertyValues } from "lit-element";
import { customElement, LitElement, property, html, internalProperty, query } from "lit-element";
import { uniqBy } from "remeda";
import styles from "./effect-editor.scss";

@customElement("effect-editor")
export class EffectEditor extends LitElement {
  static get is() {
    return "effect-editor" as const;
  }

  static styles = [styles];

  @property({ type: Object }) effect!: Effect | StringID<Effect>;

  @internalProperty() internalEffect!: Effect;

  @query("sl-form")
  form!: Form;

  @query("submit-button")
  submitButton!: SubmitButton;

  update(changedProps: PropertyValues) {
    if (changedProps.has("effect")) {
      this.internalEffect = duplicate(this.effect);
    }
    super.update(changedProps);
  }

  
  firstUpdated() {
    this.addEventListener(
      "keydown",
      (ev) => ev.key === "Enter" && this.submitButton.click(),
      { capture: true }
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

  private updateTags(ev: CustomEvent<Tag>) {
    ev.stopPropagation();
    if (this.internalEffect.type === EffectType.SuccessTest) {
      const { tags } = this.internalEffect;
      this.internalEffect = {
        ...this.internalEffect,
        tags: tags.concat(ev.detail),
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
      this.dispatchEvent(
        new CustomEvent<Effect>("effect-updated", {
          detail: this.finalizedEffect(),
        })
      );
    }
  }



  render() {
    return html`
      
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "effect-editor": EffectEditor;
  }
}
