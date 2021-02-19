import { renderTextInput } from '@src/components/field/fields';
import { renderAutoForm } from '@src/components/form/forms';
import { AptitudeType, enumValues } from '@src/data-enums';
import type { Ego } from '@src/entities/actor/ego';
import type { Character } from '@src/entities/actor/proxies/character';
import { ActorType } from '@src/entities/entity-types';
import { Favor, maxFavors, RepWithIdentifier } from '@src/features/reputations';
import { Skill, skillFilterCheck } from '@src/features/skills';
import { localize } from '@src/foundry/localization';
import { openMenu } from '@src/open-menu';
import { ReputationFavorControls } from '@src/success-test/components/reputation-favor-controls/reputation-favor-controls';
import { SkillTestControls } from '@src/success-test/components/skill-test-controls/skill-test-controls';
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
import { compact, equals, first, range, reject } from 'remeda';
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

  @internalProperty() private activeFakeId?: string;

  @internalProperty() private activeEgo?: string;

  @internalProperty()
  private skillControls = {
    filter: '',
    singleColumn: false,
  };

  @queryAll('.skill-item')
  private skillItems!: NodeListOf<HTMLElement>;

  private skillFilterCheck!: ReturnType<typeof skillFilterCheck>;

  update(changedProps: PropertyValues<this>) {
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

  private startSkillTest(skill: Skill) {
    const onboardAliId = this.activeEgo;
    SkillTestControls.openWindow({
      entities: { actor: this.character.actor },
      getState: (actor) => {
        if (actor.proxy.type !== ActorType.Character) return null;
        const tech = onboardAliId
          ? actor.proxy.equippedGroups.onboardALIs.get(onboardAliId)
          : null;
        if (onboardAliId && !tech) return null;
        const ego = tech?.onboardALI || actor.proxy.ego;
        return {
          ego,
          character: actor.proxy,
          skill: ego.skills.find((s) => s.name === skill.name) || skill,
          techSource: tech,
        };
      },
    });
  }

  private startFavorTest(reputation: RepWithIdentifier, favor: Favor) {
    ReputationFavorControls.openWindow({
      entities: { actor: this.character.actor },
      getState: (actor) => {
        if (actor.proxy.type !== ActorType.Character) return null;
        const fakeIdentifiers =
          reputation.identifier.type === 'fake' ? reputation.identifier : null;
        const fakeID = fakeIdentifiers
          ? actor.proxy.equippedGroups.fakeIDs.find(
              (i) => i.id === fakeIdentifiers.fakeEgoId,
            )
          : undefined;
        return {
          ego: actor.proxy.ego,
          character: actor.proxy,
          reputation: fakeID
            ? fakeID.repsWithIdentifiers.find(
                (r) => r.id === fakeIdentifiers?.repId,
              ) ?? reputation
            : actor.proxy.ego.trackedReps.find((rep) =>
                equals(rep.identifier, reputation.identifier),
              ) ?? reputation,
          favor,
          fakeID,
        };
      },
    });
  }

  private get repSources() {
    const { trackReputations } = this.ego;
    const { fakeIDs } = this.character.equippedGroups;
    const fakeID = this.activeFakeId
      ? fakeIDs.find((i) => i.id === this.activeFakeId)
      : null;
    const fakeIDreps = fakeID?.repsWithIdentifiers;

    const repSources = compact([
      trackReputations && {
        reps: this.ego.trackedReps,
        label: this.ego.name,
        active: !fakeIDreps,
        fake: false,
        set: () => {
          this.activeFakeId = '';
        },
      },
      ...fakeIDs.map((fake) => ({
        reps: fake.repsWithIdentifiers,
        label: fake.name,
        active:
          fakeID === fake ||
          (!trackReputations && !fakeIDreps && fake === fakeIDs[0]),
        fake: true,
        set: () => {
          this.activeFakeId = fake.id;
        },
      })),
    ]);

    return {
      sources: repSources,
      fakeID,
    };
  }

  private openRepSourceMenu() {
    openMenu({
      header: { heading: `${localize('reputation')} ${localize('profile')}` },
      content: this.repSources.sources.map((source) => ({
        label: source.label,
        activated: source.active,
        callback: source.set,
        icon: html`<mwc-icon
          >${source.fake ? 'person_outline' : 'person'}</mwc-icon
        >`,
      })),
    });
  }

  private openEgoSelectMenu() {
    const { currentEgo } = this;
    openMenu({
      header: { heading: localize('ego') },
      content: [
        {
          label: this.ego.name,
          activated: currentEgo === this.ego,
          callback: () => (this.activeEgo = undefined),
        },
        ...[...this.character.equippedGroups.onboardALIs].map(([id, tech]) => ({
          label: `${tech.name} - ${tech.onboardALI.name}`,
          activated: this.activeEgo === id,
          callback: () => (this.activeEgo = id),
        })),
      ],
    });
  }

  private get currentEgo() {
    const { onboardALIs } = this.character.equippedGroups;
    const onboard = this.activeEgo ? onboardALIs.get(this.activeEgo) : null;
    return onboard?.onboardALI || this.ego;
  }

  render() {
    const { currentEgo } = this;
    const { groupedSkills, name, aptitudes } = currentEgo;
    const { active, know } = groupedSkills;
    const { sources, fakeID } = this.repSources;
    const { softwareSkills, onboardALIs } = this.character.equippedGroups;
    // TODO: Toggle to show all reps instead of just tracked
    // TODO: Add collapse toggle
    return html`
      ${notEmpty(sources)
        ? html`
            <div class="reps">
              <span class="label">
                <mwc-icon-button
                  ?disabled=${this.ego.disabled}
                  @click=${this.openRepSourceMenu}
                  icon=${fakeID ? 'person_outline' : 'person'}
                ></mwc-icon-button>
                ${fakeID?.name ?? this.ego.name}'s
                ${localize('reputations')}</span
              >

              <ul class="rep-list">
                <li class="rep-header">
                  <span>${localize('network')}</span>
                  <span>${localize('score')}</span>
                  ${[...maxFavors.keys()].map(
                    (key) =>
                      html`<span title="${localize(key)} ${localize('favors')}"
                        >${localize(key).slice(0, 3)}</span
                      >`,
                  )}
                </li>
                ${(fakeID?.repsWithIdentifiers ?? sources[0]?.reps!).map(
                  this.renderRep,
                )}
              </ul>
            </div>
          `
        : ''}
      ${notEmpty(softwareSkills)
        ? html`
            <div class="software-section">
              <sl-header
                heading="${localize('software')} ${localize('skills')}"
              ></sl-header>
              <ul class="software">
                ${softwareSkills.map(
                  (software) => html`
                    <li>
                      ${software.name}
                      <ul class="software-skills">
                        ${software.skills.map(
                          ({ name, specialization, total }) => html`
                            <li>
                              <span class="software-skill-name"
                                >${name}
                                ${specialization
                                  ? `(${specialization})`
                                  : ''}</span
                              >
                              <span class="software-skill-total">${total}</span>
                            </li>
                          `,
                        )}
                      </ul>
                    </li>
                  `,
                )}
              </ul>
            </div>
          `
        : ''}

      <section class="ego">
        <header>
          <mwc-icon-button
            ?disabled=${this.ego.disabled}
            @click=${this.openEgoSelectMenu}
            icon=${fakeID ? 'person_outline' : 'person'}
          ></mwc-icon-button>
          ${currentEgo === this.ego
            ? name
            : `${this.character.items.get(this.activeEgo!)?.name} - ${
                currentEgo.name
              }`}
          - ${localize('aptitudes')} & ${localize('skills')}
        </header>
        <ul class="aptitudes">
          ${enumValues(AptitudeType).map(
            (aptitude) => html`
              <wl-list-item
                class="aptitude"
                clickable
                ?disabled=${this.character.disabled}
              >
                <span slot="before">${localize(aptitude)}</span>
                <span class="points">${aptitudes[aptitude]}</span>
                <span class="check"
                  ><mwc-icon>check</mwc-icon> ${aptitudes[aptitude] * 3}</span
                >
              </wl-list-item>
            `,
          )}
        </ul>

        <ul class="skills-list">
          <li class="filter">
            ${renderAutoForm({
              classes: 'skill-controls',
              storeOnInput: true,
              noDebounce: true,
              props: this.skillControls,
              update: this.updateSkillControls,
              fields: ({ filter }) => html`
                <span>${localize('skills')}</span>
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
          ${active?.map(this.renderSkill)}
          ${notEmpty(know)
            ? html`
                <li class="divider" role="separator"></li>
                ${know.map(this.renderSkill)}
              `
            : ''}
        </ul>
      </section>
    `;
  }

  private renderSkill = (skill: Skill) => {
    const filtered = this.skillFilterCheck(skill);
    return html` <wl-list-item
      clickable
      class="skill-item ${classMap({ filtered })}"
      ?disabled=${this.disabled}
      .tabindex=${live(filtered ? -1 : 0)}
      @click=${() => this.startSkillTest(skill)}
    >
      <span class="skill-name">${skill.fullName}</span>
      <span class="skill-total" slot="after">${skill.total}</span>
    </wl-list-item>`;
  };

  private renderRep = (rep: RepWithIdentifier) => {
    return html`
      <li class="rep-item">
        <button
          title="${rep.network} (${rep.acronym})"
          class="trivial-start"
          @click=${() => this.startFavorTest(rep, Favor.Trivial)}
        >
          <span class="rep-name">
            ${rep.network}
            <span class="rep-acronym">${rep.acronym}</span></span
          >
        </button>
        <span class="rep-score">${rep.score}</span>
        <!-- <div class="favors"> -->
        ${[...maxFavors].map(([favor, max]) => {
          const usedAmount = rep[favor];
          return html`
            <button
              title=${localize(favor)}
              @click=${() => this.startFavorTest(rep, favor)}
              class="rep-favor"
            >
              ${range(1, max + 1).map(
                (favorNumber) => html`
                  <mwc-icon
                    >${usedAmount >= favorNumber
                      ? 'check_box'
                      : 'check_box_outline_blank'}</mwc-icon
                  >
                `,
              )}
            </button>
          `;
        })}
        <!-- </div> -->
      </li>
    `;
  };
}

declare global {
  interface HTMLElementTagNameMap {
    'character-view-test-actions': CharacterViewTestActions;
  }
}
