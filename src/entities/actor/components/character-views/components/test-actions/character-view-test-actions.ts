import { renderTextInput } from '@src/components/field/fields';
import { renderAutoForm } from '@src/components/form/forms';
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
    SkillTestControls.openWindow({
      entities: { actor: this.character.actor },
      getState: (actor) => {
        if (actor.proxy.type !== ActorType.Character) return null;
        return {
          ego: actor.proxy.ego,
          character: actor.proxy,
          skill:
            actor.proxy.ego.skills.find((s) => s.name === skill.name) || skill,
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

  private openRepSourceMenu() {
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
          fakeIDreps === fake.repsWithIdentifiers ||
          (!trackReputations && !fakeIDreps && fake === fakeIDs[0]),
        fake: true,
        set: () => {
          this.activeFakeId = fake.id;
        },
      })),
    ]);

    openMenu({
      header: { heading: `${localize('reputation')} ${localize('profile')}` },
      content: repSources.map((source) => ({
        label: source.label,
        activated: source.active,
        callback: source.set,
        icon: html`<mwc-icon
          >${source.fake ? 'person_outline' : 'person'}</mwc-icon
        >`,
      })),
    });
  }

  render() {
    const { groupedSkills, trackReputations } = this.ego;
    const { active, know } = groupedSkills;
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
          fakeIDreps === fake.repsWithIdentifiers ||
          (!trackReputations && !fakeIDreps && fake === fakeIDs[0]),
        fake: true,
        set: () => {
          this.activeFakeId = fake.id;
        },
      })),
    ]);
    return html`
      ${notEmpty(repSources)
        ? html`
            <div class="reps">
              <span class="label">
                <mwc-icon-button
                  ?disabled=${this.ego.disabled}
                  @click=${this.openRepSourceMenu}
                  icon=${fakeIDreps ? 'person_outline' : 'person'}
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
                ${(fakeIDreps ?? repSources[0]?.reps!).map(this.renderRep)}
              </ul>
            </div>
          `
        : ''}

      <!-- <ul class="skills-list">
        <li class="filter">
          ${renderAutoForm({
        classes: 'skill-controls',
        storeOnInput: true,
        noDebounce: true,
        props: this.skillControls,
        update: this.updateSkillControls,
        fields: ({ filter }) => html`
          <span>${localize('skills')}</span>
          <div class="skill-filter" @keypress=${this.findFirstUnfilteredSkill}>
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
      </ul> -->
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
          title=${rep.network}
          class="rep-acronym"
          @click=${() => this.startFavorTest(rep, Favor.Trivial)}
        >
          ${rep.network}
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
