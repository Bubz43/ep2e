import {
  renderNumberField,
  renderNumberInput,
} from '@src/components/field/fields';
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
        <span class="info"
          >${this.psi.strain} ${localize('substrain')} ${localize('level')}
          ${this.psi.level}</span
        >
      </header>

      ${this.psi.hasVariableInfection ? this.renderInfectionInfo() : ''}
    `;
  }

  private renderInfectionInfo() {
    return html`
    ${this.renderInfectionTracker()}
    <div class="actions">
      <mwc-button unelevated dense>${localize("infection")} ${localize("test")}</mwc-button>
      <mwc-button unelevated dense>${localize("roll")} ${localize("influences")}</mwc-button>
    </div>
    `
  }

  private renderInfectionTracker() {
    const {
      infectionRating,
      baseInfectionRating,
      editable,
      hasChiIncreasedEffect,
      level,
    } = this.psi;

    return html` <section class="infection-tracker">
      ${renderAutoForm({
        classes: "infection",
        disabled: !editable,
        props: { infectionRating },
        update: ({ infectionRating }) =>
          infectionRating && this.psi.updateInfectionRating(infectionRating),
        fields: ({ infectionRating }) =>
          renderNumberInput(infectionRating, {
            min: baseInfectionRating,
            max: 99,
          }),
      })}
     

      <mwc-linear-progress
        class="infection-progress"
        progress=${infectionRating / 99}
      ></mwc-linear-progress>
      <div
        class="progress-overlay"
        style="width: calc(${baseInfectionRating}% + 1px)"
      ></div>

      <div
        class=${classMap({
          'increased-chi': true,
          active: hasChiIncreasedEffect,
        })}
        title="${localize(PsiPush.IncreasedEffect)} ${localize('psiChi')}"
      >
        ${localize('psiChi')} +
      </div>
      ${level > 1 ? this.renderFreePush() : ''}
    </section>`;
  }



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
          title=${localize('freePush')}
        >
          ${localize(
            freePushClasses.active
              ? activeFreePush || 'selectFreePush'
              : 'freePush',
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
          ?selected=${freePush === ''}
          @click=${() => this.psi.updateFreePush('')}
          >${localize('no')} ${localize('freePush')}</mwc-radio-list-item
        >
        <li divider></li>
        ${enumValues(PsiPush).map(
          (push) => html`
            <mwc-radio-list-item
              ?selected=${push === freePush}
              @click=${() => this.psi.updateFreePush(push)}
              >${localize(push)}</mwc-radio-list-item
            >
          `,
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
