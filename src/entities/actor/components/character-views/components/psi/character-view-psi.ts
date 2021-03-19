import type { Slider } from '@material/mwc-slider';
import { createMessage, MessageVisibility } from '@src/chat/create-message';
import { enumValues, PsiPush } from '@src/data-enums';
import type { Character } from '@src/entities/actor/proxies/character';
import type { Psi } from '@src/entities/item/proxies/psi';
import { influenceInfo, influenceRolls } from '@src/features/psi-influence';
import { localize } from '@src/foundry/localization';
import { rollFormula } from '@src/foundry/rolls';
import { tooltip } from '@src/init';
import { openMenu } from '@src/open-menu';
import { notEmpty } from '@src/utility/helpers';
import {
  customElement,
  html,
  LitElement,
  property,
  PropertyValues,
  query,
} from 'lit-element';
import { classMap } from 'lit-html/directives/class-map';
import { repeat } from 'lit-html/directives/repeat';
import { mapToObj } from 'remeda';
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

  @query('mwc-slider') private slider?: Slider;

  // firstUpdated() {
  //   setTimeout(() => {
  //     this.renderRoot.querySelector('mwc-slider')?.layout();
  //   }, 100);
  // }

  private resizeObs: ResizeObserver | null = null;

  connectedCallback() {
    this.resizeObs = new ResizeObserver(() => this.layoutSlider());
    this.resizeObs.observe(this);
    super.connectedCallback();
  }

  disconnectedCallback() {
    this.resizeObs?.disconnect();
    this.resizeObs = null;
    super.disconnectedCallback();
  }

  updated(changedProps: PropertyValues<this>) {
    super.updated(changedProps);
    requestAnimationFrame(() => this.layoutSlider());
  }

  private layoutSlider() {
    this.slider?.layout();
  }

  openPsiMenu() {
    openMenu({
      content: [
        {
          label: localize('infectionTest'),
          callback: () => {},
        },
        {
          label: `${localize('roll')} ${localize('influences')}`,
          callback: () => {
            const roll = rollFormula('1d6');
            if (roll) {
              createMessage({
                entity: this.character,
                visibility: MessageVisibility.WhisperGM,
                data: {
                  header: this.psi.messageHeader,
                  influenceRoll: {
                    rollData: roll.toJSON(),
                    influences: mapToObj(influenceRolls, (roll) => {
                      const influence = this.psi.fullInfluences[roll];
                      return [
                        roll,
                        {
                          id: influence.id,
                          name: influenceInfo(influence).name,
                        },
                      ];
                    }),
                  },
                },
              });
            }
          },
        },
      ],
    });
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
        <mwc-icon-button
          @click=${this.openPsiMenu}
          icon="more_vert"
        ></mwc-icon-button>

        <span class="info"
          >${this.psi.strain} ${localize('substrain')} ${localize('level')}
          ${this.psi.level}</span
        >
      </header>

      ${this.psi.hasVariableInfection ? this.renderInfectionInfo() : ''}
    `;
  }

  private renderInfectionInfo() {
    const { activePsiInfluences } = this.psi;
    return html`
      ${this.renderInfectionTracker()}
      ${notEmpty(activePsiInfluences)
        ? html`
            <div class="active-influences">
              ${repeat(
                activePsiInfluences,
                ([{ id }]) => id,
                ([influence, timeState]) => {
                  const { name, description } = influenceInfo(influence);
                  return html`
                    <colored-tag
                      data-tooltip=${description}
                      @mouseover=${tooltip.fromData}
                      >${name}</colored-tag
                    >
                  `;
                },
              )}
            </div>
          `
        : ''}
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
      <button class="infection">${infectionRating}</button>

      <div class="progress">
        <div
          class="progress-overlay"
          style="width: calc(${baseInfectionRating}% + 1px)"
        ></div>
        <mwc-slider
          class="infection-progress"
          value=${infectionRating}
          min=${baseInfectionRating}
          max=${99}
          ?disabled=${!editable}
          step="1"
          pin
          @change=${(ev: Event & { currentTarget: Slider }) => {
            this.psi.updateInfectionRating(ev.currentTarget.value);
          }}
          @mouseover=${this.layoutSlider}
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
          solo: level < 2,
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
