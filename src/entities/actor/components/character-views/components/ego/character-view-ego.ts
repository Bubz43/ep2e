import { renderTextInput } from '@src/components/field/fields';
import { renderAutoForm } from '@src/components/form/forms';
import { AptitudeType, enumValues } from '@src/data-enums';
import type { Ego } from '@src/entities/actor/ego';
import type { Character } from '@src/entities/actor/proxies/character';
import { maxFavors } from '@src/features/reputations';
import { Skill, skillFilterCheck } from '@src/features/skills';
import { localize } from '@src/foundry/localization';
import { notEmpty, safeMerge } from '@src/utility/helpers';
import {
  customElement,
  html,
  internalProperty,
  LitElement,
  property,
  PropertyValues,
  queryAll,
} from 'lit-element';
import { classMap } from 'lit-html/directives/class-map';
import { live } from 'lit-html/directives/live';
import { compact, first, range, reject } from 'remeda';
import { CharacterDrawerRenderer, CharacterDrawerRenderEvent } from '../../character-drawer-render-event';
import styles from './character-view-ego.scss';

@customElement('character-view-ego')
export class CharacterViewEgo extends LitElement {
  static get is() {
    return 'character-view-ego' as const;
  }

  static styles = [styles];

  @property({ attribute: false }) character!: Character;

  @property({ attribute: false }) ego!: Ego;

  @queryAll('.skill-item')
  skillItems!: NodeListOf<HTMLElement>;

  @internalProperty()
  private skillControls = {
    filter: '',
    singleColumn: false,
  };

  private skillFilterCheck!: ReturnType<typeof skillFilterCheck>;

  update(changedProps: PropertyValues) {
    this.skillFilterCheck = skillFilterCheck(this.skillControls.filter);
    super.update(changedProps);
  }

  private updateSkillControls = (
    changed: Partial<CharacterViewEgo['skillControls']>,
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

  private requestMentalHealthDrawer() {
    this.dispatchEvent(new CharacterDrawerRenderEvent(CharacterDrawerRenderer.MentalHealth))
  }

  render() {
    const { active, know } = this.ego.groupedSkills;

    return html`
      <header>
        <!-- <span class="label">${localize('ego')
          .split('')
          .map((char) => html`<span>${char}</span>`)}</span> -->
        <button @click=${this.ego.openForm}>${this.ego.name}</button>
        <span class="details">
          ${compact([
            this.ego.egoType,
            this.ego.forkStatus &&
              `${localize(this.ego.forkStatus)} ${localize('fork')}`,
          ]).join(' • ')}</span
        >
      </header>

      <sl-section heading=${localize('aptitudes')} flipped>
        <sl-group
          slot="control"
          class="initiative"
          label=${localize('initiative')}
          >${this.character.initiative}</sl-group
        >
        <ul class="aptitudes-list">
          ${enumValues(AptitudeType).map(this.renderAptitude)}
        </ul>
        ${this.ego.trackMentalHealth
          ? html`
              <health-item
              @click=${this.requestMentalHealthDrawer}
              clickable
                class="mental-health-view"
                .health=${this.ego.mentalHealth}
                ><span slot="source"
                  >${localize('mentalHealth')}</span
                ></health-item
              >
            `
          : ''}
      </sl-section>

      <sl-section heading=${localize('skills')} flipped>
        ${renderAutoForm({
          classes: 'skill-controls',
          storeOnInput: true,
          noDebounce: true,
          slot: 'control',
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

        <ul class="skills-list">
          ${active?.map(this.renderSkill)}
          ${notEmpty(know)
            ? html`
                <li class="divider" role="separator"></li>
                ${know.map(this.renderSkill)}
              `
            : ''}
        </ul>
      </sl-section>

      ${this.ego.trackReputations
        ? html`
            <sl-section heading=${localize('reputations')} flipped>
              <ul class="rep-list">
                ${this.ego.trackedReps.map(this.renderRep)}
              </ul>
            </sl-section>
          `
        : ''}
    `;
  }

  private renderAptitude = (type: AptitudeType) => {
    const points = this.ego.aptitudes[type];
    return html` <wl-list-item
      clickable
      ?disabled=${this.disabled}
      class="aptitude-item"
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
      tabindex=${live(filtered ? '-1' : '0')}
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
    'character-view-ego': CharacterViewEgo;
  }
}
