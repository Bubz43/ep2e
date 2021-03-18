import type { Slider } from '@material/mwc-slider';
import { renderNumberInput } from '@src/components/field/fields';
import { renderAutoForm } from '@src/components/form/forms';
import { enumValues, PsiPush } from '@src/data-enums';
import type { Character } from '@src/entities/actor/proxies/character';
import type { Psi } from '@src/entities/item/proxies/psi';
import { localize } from '@src/foundry/localization';
import { openMenu } from '@src/open-menu';
import { customElement, html, LitElement, property } from 'lit-element';
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

  firstUpdated() {
    requestAnimationFrame(() =>
      this.renderRoot.querySelector('mwc-slider')?.layout(),
    );
  }

  private openFreePushMenu() {
    const { freePush } = this.psi;
    openMenu({
      header: { heading: localize('freePush') },
      content: [
        {
          label: `${localize('no')} ${localize('freePush')}`,
          callback: () => this.psi.updateFreePush(''),
          activated: !freePush,
        },
        ...enumValues(PsiPush).map((push) => ({
          label: localize(push),
          callback: () => this.psi.updateFreePush(push),
          activated: freePush === push,
        })),
      ],
    });
  }

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
      <!-- <div class="actions">
        <mwc-button dense
          >${localize('infection')} ${localize('test')}</mwc-button
        >
        <mwc-button dense
          >${localize('roll')} ${localize('influences')}</mwc-button
        >
      </div> -->
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

    return html` <section class="infection-tracker">
      ${renderAutoForm({
        classes: 'infection',
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

      <div class="progress">
        <div
          class="progress-overlay"
          style="width: calc(${baseInfectionRating}% + 1px)"
        ></div>
        <mwc-slider
          class="infection-progress"
          value=${infectionRating}
          min=${20}
          max=${99}
          ?disabled=${!editable}
          step="1"
          pin
          @change=${(ev: Event & { currentTarget: Slider }) => {
            this.psi.updateInfectionRating(ev.currentTarget.value);
          }}
        >
        </mwc-slider>
      </div>

      <!-- <mwc-linear-progress
        class="infection-progress"
        progress=${infectionRating / 99}
      ></mwc-linear-progress> -->

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
      <button
        @click=${this.openFreePushMenu}
        class="free-push ${classMap(freePushClasses)}"
        title=${localize('freePush')}
        ?disabled=${!hasFreePushEffect}
      >
        ${localize(
          freePushClasses.active
            ? activeFreePush || 'selectFreePush'
            : 'freePush',
        )}
      </button>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'character-view-psi': CharacterViewPsi;
  }
}
