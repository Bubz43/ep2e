import { renderTextInput } from '@src/components/field/fields';
import { renderAutoForm } from '@src/components/form/forms';
import {
  closeWindow,
  openWindow,
} from '@src/components/window/window-controls';
import {
  ResizeOption,
  SlWindowEventName,
} from '@src/components/window/window-options';
import { enumValues, AptitudeType } from '@src/data-enums';
import type { ActorEP } from '@src/entities/actor/actor';
import type { Ego } from '@src/entities/actor/ego';
import type { Character } from '@src/entities/actor/proxies/character';
import { ActorType } from '@src/entities/entity-types';
import { maxFavors } from '@src/features/reputations';
import { skillFilterCheck, Skill } from '@src/features/skills';
import { LangEntry, localize } from '@src/foundry/localization';
import { AptitudeCheck } from '@src/success-test/aptitude-check';
import { safeMerge, notEmpty } from '@src/utility/helpers';
import {
  customElement,
  LitElement,
  property,
  html,
  internalProperty,
  PropertyValues,
  queryAll,
} from 'lit-element';
import { classMap } from 'lit-html/directives/class-map';
import { live } from 'lit-html/directives/live';
import { reject, first, range } from 'remeda';
import { traverseActiveElements } from 'weightless';
import styles from './character-view-test-actions.scss';

@customElement('character-view-test-actions')
export class CharacterViewTestActions extends LitElement {
  static get is() {
    return 'character-view-test-actions' as const;
  }

  static get styles() {
    return [styles];
  }

  @property({ attribute: false }) character!: Character;

  @property({ attribute: false }) ego!: Ego;

  @internalProperty()
  private skillControls = {
    filter: '',
    singleColumn: false,
  };

  @queryAll('.skill-item')
  private skillItems!: NodeListOf<HTMLElement>;

  private skillFilterCheck!: ReturnType<typeof skillFilterCheck>;

  update(changedProps: PropertyValues) {
    this.skillFilterCheck = skillFilterCheck(this.skillControls.filter);
    super.update(changedProps);
  }

  private updateSkillControls = (
    changed: Partial<CharacterViewTestActions['skillControls']>,
  ) => {
    this.skillControls = safeMerge(this.skillControls, changed);
  };

  private findFirstUnfilteredSkill = (ev: KeyboardEvent) => {
    if (ev.key === 'Enter') {
      const unfiltered = reject([...this.skillItems], (skillItem) =>
        skillItem.classList.contains('filtered'),
      );
      first(unfiltered)?.[unfiltered.length > 1 ? 'focus' : 'click']();
    }
  };

  get disabled() {
    return this.character.disabled;
  }

  private startAptitudeTest(aptitude: AptitudeType) {
    AptitudeCheck.openWindow(aptitude, this.character.actor);
  }

  render() {
    const { active, know } = this.ego.groupedSkills;

    return html`
      <div class="stats">
        <ul class="aptitudes-list">
          ${enumValues(AptitudeType).map(this.renderAptitude)}
        </ul>

        ${this.ego.trackReputations
          ? html`
              <ul class="rep-list">
                ${this.ego.trackedReps.map(this.renderRep)}
              </ul>
            `
          : ''}

        <ul class="skills-list">
          ${active?.map(this.renderSkill)}
          ${notEmpty(know)
            ? html`
                <li class="divider" role="separator"></li>
                ${know.map(this.renderSkill)}
              `
            : ''}
          <li class="filter">
            ${renderAutoForm({
              classes: 'skill-controls',
              storeOnInput: true,
              noDebounce: true,
              props: this.skillControls,
              update: this.updateSkillControls,
              fields: ({ filter }) => html`
                <div
                  class="skill-filter"
                  @keypress=${this.findFirstUnfilteredSkill}
                >
                  ${renderTextInput(filter, {
                    search: true,
                    placeholder: localize('filter'),
                  })}
                </div>
              `,
            })}
          </li>
        </ul>
      </div>
    `;
  }

  private renderAptitude = (type: AptitudeType) => {
    const points = this.ego.aptitudes[type];
    return html` <wl-list-item
      clickable
      ?disabled=${this.disabled}
      class="aptitude-item"
      @click=${() => this.startAptitudeTest(type)}
    >
      <span class="aptitude-name">${localize(type)}</span>
      <div class="aptitude-values">
        <span class="aptitude-points">${points}</span>
        <span class="aptitude-check">${points * 3}</span>
      </div>
    </wl-list-item>`;
  };

  private renderSkill = (skill: Skill) => {
    const filtered = this.skillFilterCheck(skill);
    return html` <wl-list-item
      clickable
      class="skill-item ${classMap({ filtered })}"
      ?disabled=${this.disabled}
      tabindex=${live(filtered ? -1 : 0)}
    >
      <span class="skill-name">${skill.fullName}</span>
      <span class="skill-total" slot="after">${skill.total}</span>
    </wl-list-item>`;
  };

  private renderRep = (rep: Ego['trackedReps'][number]) => {
    return html`
      <li class="rep-item">
        <span title=${rep.network} class="rep-acronym">${rep.acronym}</span>
        <span class="rep-score">${rep.score}</span>
        <div class="favors">
          ${[...maxFavors].map(([favor, max]) => {
            const usedAmount = rep[favor];
            return html`
              <span title=${localize(favor)}>
                ${range(1, max + 1).map(
                  (favorNumber) => html`
                    <mwc-icon
                      >${usedAmount >= favorNumber
                        ? 'check_box'
                        : 'check_box_outline_blank'}</mwc-icon
                    >
                  `,
                )}
              </span>
            `;
          })}
        </div>
      </li>
    `;
  };
}

declare global {
  interface HTMLElementTagNameMap {
    'character-view-test-actions': CharacterViewTestActions;
  }
}
