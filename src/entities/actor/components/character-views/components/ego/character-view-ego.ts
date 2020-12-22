import { renderTextInput } from '@src/components/field/fields';
import { renderAutoForm } from '@src/components/form/forms';
import { TabsMixin } from '@src/components/mixins/tabs-mixin';
import { AptitudeType, enumValues } from '@src/data-enums';
import type { Ego } from '@src/entities/actor/ego';
import type { Character } from '@src/entities/actor/proxies/character';
import { idProp } from '@src/features/feature-helpers';
import { MotivationStance } from '@src/features/motivations';
import { maxFavors } from '@src/features/reputations';
import { Skill, skillFilterCheck } from '@src/features/skills';
import { localize } from '@src/foundry/localization';
import { HealthEditor } from '@src/health/components/health-editor/health-editor';
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
import { repeat } from 'lit-html/directives/repeat';
import { compact, first, prop, range, reject } from 'remeda';
import { traverseActiveElements } from 'weightless';
import {
  CharacterDrawerRenderer,
  CharacterDrawerRenderEvent,
} from '../../character-drawer-render-event';
import styles from './character-view-ego.scss';

@customElement('character-view-ego')
export class CharacterViewEgo extends TabsMixin(["stats", "details"])(LitElement) {
  static get is() {
    return 'character-view-ego' as const;
  }

  static styles = [styles];

  @property({ attribute: false }) character!: Character;

  @property({ attribute: false }) ego!: Ego;

  @internalProperty() private expanded = false;

  @internalProperty()
  private skillControls = {
    filter: '',
    singleColumn: false,
  };

  @queryAll('.skill-item')
  skillItems!: NodeListOf<HTMLElement>;

  private skillFilterCheck!: ReturnType<typeof skillFilterCheck>;

  update(changedProps: PropertyValues) {
    this.skillFilterCheck = skillFilterCheck(this.skillControls.filter);
    super.update(changedProps);
  }

  private toggleExpanded() {
    this.expanded = !this.expanded;
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
    this.dispatchEvent(
      new CharacterDrawerRenderEvent(CharacterDrawerRenderer.MentalHealth),
    );
  }

  protected openHealthEditor() {
    this.character.openHealthEditor(this.ego.mentalHealth);
  }

  render() {
    const { filteredMotivations, settings } = this.ego;
    return html`
      <header>
        ${settings.trackPoints
          ? html`
              <sl-animated-list class="resource-points">
                ${repeat(
                  this.ego.points,
                  prop('point'),
                  ({ label, value }) => html`
                    <li>${label} <span class="value">${value}</span></li>
                  `,
                )}
              </sl-animated-list>
            `
          : ''}

        <button class="name" @click=${this.ego.openForm}>
          ${this.ego.name}
        </button>
        <span class="info">
          ${compact([
            `${this.ego.egoType} ${localize('ego')}`,
            this.ego.forkStatus &&
              `${localize(this.ego.forkStatus)} ${localize('fork')}`,
          ]).join(' • ')}
        </span>

        <!-- <sl-group
          class="initiative"
          label=${localize('initiative')}
          >${this.character.initiative}</sl-group
        >
   -->
      </header>

      ${this.ego.trackMentalHealth
        ? html`
            <health-item
              @click=${this.requestMentalHealthDrawer}
              @contextmenu=${this.openHealthEditor}
              clickable
              class="mental-health-view"
              .health=${this.ego.mentalHealth}
              ><span slot="source"
                >${localize('mentalHealth')}</span
              ></health-item
            >
          `
        : ''}
      ${notEmpty(filteredMotivations)
        ? html`
            <sl-animated-list class="motivations-list"
              >${repeat(
                filteredMotivations,
                idProp,
                this.renderMotivation,
              )}</sl-animated-list
            >
          `
      : ''}
        
        ${this.renderTabBar()}
              ${this.renderTabbedContent(this.activeTab)}
 
    `;
    // return html`
    //   <header class="header">
    //     <button @click=${this.ego.openForm}>${this.ego.name}</button>
    //     <span class="details">
    //       ${compact([
    //         this.ego.egoType,
    //         this.ego.forkStatus &&
    //           `${localize(this.ego.forkStatus)} ${localize('fork')}`,
    //       ]).join(' • ')}</span
    //     >
    //     ${showMore
    //       ? html`
    //           <mwc-icon-button
    //             icon=${this.expanded ? 'unfold_less' : 'unfold_more'}
    //             @click=${this.toggleExpanded}
    //           ></mwc-icon-button>
    //         `
    //       : ''}
    //   </header>



    //   <sl-section heading=${localize('skills')} flipped>
  

    //   </sl-section>


    // `;
  }

  protected renderTabbedContent(tab: CharacterViewEgo["tabs"][number]) {
    return tab === "stats" ? this.renderStats() : this.renderDetails();
  }

  protected renderStats() {
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

     
    `

  }

  protected renderDetails() {
    return html`
               ${notEmpty(this.ego.details)
              ? html`
                  <div class="details">
                    ${this.ego.details.map(
                      ({ label, value }) => html`
                        <span class="details"
                          >${label} <span class="value">${value}</span></span
                        >
                      `,
                    )}
                  </div>
                `
              : ''}
            ${this.ego.description
              ? html`
                  <enriched-html
                    .content=${this.ego.description}
                  ></enriched-html>
                `
              : ''}
    `
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

  private renderMotivation = (motivation: Ego['motivations'][number]) => {
    // TODO heal stress
    // TODO Show goals
    return html`
      <li class="motivation">
        <button>
          <mwc-icon class=${motivation.stance}
            >${motivation.stance === MotivationStance.Support
              ? 'add'
              : 'remove'}</mwc-icon
          >
          ${motivation.cause}
        </button>
      </li>
    `;
  };
}

declare global {
  interface HTMLElementTagNameMap {
    'character-view-ego': CharacterViewEgo;
  }
}
