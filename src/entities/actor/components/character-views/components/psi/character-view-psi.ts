import { renderNumberField } from '@src/components/field/fields';
import { renderAutoForm } from '@src/components/form/forms';
import { Origin } from '@src/components/popover/popover-options';
import { PsiPush, enumValues } from '@src/data-enums';
import type { Character } from '@src/entities/actor/proxies/character';
import type { Psi } from '@src/entities/item/proxies/psi';
import { localize } from '@src/foundry/localization';
import { customElement, LitElement, property, html } from 'lit-element';
import { classMap } from 'lit-html/directives/class-map';
import styles from './character-view-psi.scss';

@customElement('character-view-psi')
export class CharacterViewPsi extends LitElement {
  static get is() {
    return 'character-view-psi' as const;
  }

  static get styles() {
    return [styles];
  }

  @property({ attribute: false }) character!: Character;

  @property({ attribute: false }) psi!: Psi;

  render() {
    return html`
      <header>
        <button class="name" @click=${this.psi.openForm}>
          ${this.psi.name}
        </button>
      </header>

      ${this.psi.hasVariableInfection ? this.renderInfectionTracker() : ""}
    `;
  }

  private renderInfectionTracker() {
    const {
      infectionRating,
      baseInfectionRating,
      editable,
      hasChiIncreasedEffect,
      level,
    } = this.psi;

    const disabled = !editable;
    return html` <section class="infection-tracker">
      <sl-popover
        origin=${Origin.Inset}
        center
        class="rating-popover"
        .renderOnDemand=${this.infectionEdit}
        focusSelector="input"
      >
        <button slot="base" class="infection-rating" ?disabled=${disabled}>
          ${infectionRating}
        </button>
      </sl-popover>

      <mwc-linear-progress
        class="infection-progress"
        progress=${infectionRating / 99}
      ></mwc-linear-progress>
      <div
        class="progress-overlay"
        style="width: ${baseInfectionRating}%"
      ></div>

      <div
        class=${classMap({
          "increased-chi": true,
          active: hasChiIncreasedEffect,
        })}
        title="${localize(PsiPush.IncreasedEffect)} ${localize("psiChi")}"
      >
        ${localize("psiChi")} +
      </div>
      ${level > 1 ? this.renderFreePush() : ""}
    </section>`;
  }

  private infectionEdit = () => {
    const { infectionRating, baseInfectionRating } = this.psi;
    return renderAutoForm({
      props: { infectionRating },
      update: ({ infectionRating }) =>
        infectionRating && this.psi.updateInfectionRating(infectionRating),
      fields: ({ infectionRating }) =>
        renderNumberField(infectionRating, {
          ...this.psi.infectionClamp,
          helpText: `${localize(
            "baseInfectionRating"
          )}: ${baseInfectionRating}`,
          helpPersistent: true,
        }),
    });
  };


  private renderFreePush() {
    const { hasFreePushEffect, activeFreePush } = this.psi;
    const freePushClasses = {
      active: hasFreePushEffect,
      selection: hasFreePushEffect && !activeFreePush,
    };
    return html`
      <sl-popover
        class="free-push-popover"
        unpadded
        .renderOnDemand=${this.freePushEdit}
      >
        <div
          slot="base"
          class="free-push ${classMap(freePushClasses)}"
          title=${localize("freePush")}
        >
          ${localize(
            freePushClasses.active
              ? activeFreePush || "selectFreePush"
              : "freePush"
          )}
        </div>
      </sl-popover>
    `;
  }

  private freePushEdit = () => {
    const { freePush } = this.psi;
    return html`
      <mwc-list>
        <mwc-radio-list-item
          ?selected=${freePush === ""}
          @click=${() => this.psi.updateFreePush("")}
          >${localize("no")} ${localize("freePush")}</mwc-radio-list-item
        >
        <li divider></li>
        ${enumValues(PsiPush).map(
          (push) => html`
            <mwc-radio-list-item
              ?selected=${push === freePush}
              @click=${() => this.psi.updateFreePush(push)}
              >${localize(push)}</mwc-radio-list-item
            >
          `
        )}
      </mwc-list>
    `;
  };
}

declare global {
  interface HTMLElementTagNameMap {
    'character-view-psi': CharacterViewPsi;
  }
}
