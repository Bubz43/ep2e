import { renderTextInput } from '@src/components/field/fields';
import { renderAutoForm } from '@src/components/form/forms';
import { AptitudeType, enumValues } from '@src/data-enums';
import type { Ego } from '@src/entities/actor/ego';
import type { Character } from '@src/entities/actor/proxies/character';
import { ActorType } from '@src/entities/entity-types';
import type { Software } from '@src/entities/item/proxies/software';
import { Favor, maxFavors, RepWithIdentifier } from '@src/features/reputations';
import { Skill, skillFilterCheck } from '@src/features/skills';
import { localize } from '@src/foundry/localization';
import { openMenu } from '@src/open-menu';
import { AptitudeCheckControls } from '@src/success-test/components/aptitude-check-controls/aptitude-check-controls';
import { ReputationFavorControls } from '@src/success-test/components/reputation-favor-controls/reputation-favor-controls';
import { SkillTestControls } from '@src/success-test/components/skill-test-controls/skill-test-controls';
import { SoftwareSkillTestControls } from '@src/success-test/components/software-skill-test-controls/software-skill-test-controls';
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

  private startAptitudeTest(aptitude: AptitudeType) {
    const onboardAliId = this.activeEgo;

    AptitudeCheckControls.openWindow({
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
          aptitude,
          techSource: tech,
        };
      },
    });
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

  private startSoftwareSkillTest(
    skill: Software['skills'][number],
    software: Software,
  ) {
    const { id } = software;
    SoftwareSkillTestControls.openWindow({
      entities: { actor: this.character.actor },
      getState: (actor) => {
        if (actor.proxy.type !== ActorType.Character) return null;
        const softwareSource = actor.proxy.equippedGroups.softwareSkills.find(
          (s) => s.id === id,
        );
        const softwareSkill = softwareSource?.skills.find(
          (s) => s.id === skill.id,
        );
        if (!softwareSkill || !softwareSource) return null;
        return {
          software: softwareSource,
          skill: softwareSkill,
          character: actor.proxy,
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

  private openRepSourceMenu(ev: MouseEvent) {
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
      position: ev,
    });
  }

  private openEgoSelectMenu(ev: MouseEvent) {
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
      position: ev,
    });
  }

  private get currentEgo() {
    const { onboardALIs } = this.character.equippedGroups;
    const onboard = this.activeEgo ? onboardALIs.get(this.activeEgo) : null;
    return onboard?.onboardALI || this.ego;
  }

  render() {
    const { currentEgo, activeEgo } = this;
    const { groupedSkills, name, aptitudes } = currentEgo;
    const { active, know } = groupedSkills;
    const { sources, fakeID } = this.repSources;
    const {
      softwareSkills,
      fakeIDs,
      onboardALIs,
    } = this.character.equippedGroups;
    // TODO: Toggle to show all reps instead of just tracked
    // TODO: Add collapse toggle
    const reps = fakeID?.repsWithIdentifiers ?? sources[0]?.reps!;
    const showSource = !!onboardALIs.size;
    return html`
      ${showSource
        ? html`
            <wl-list-item
              role="button"
              @click=${this.openEgoSelectMenu}
              clickable
              class="source"
            >
              <span slot="before">${localize('source')}:</span>
              <span>
                ${activeEgo ? onboardALIs.get(activeEgo)?.name : ''}
                ${currentEgo.name}</span
              >

              <mwc-icon slot="after" ?disabled=${this.ego.disabled}
                >${currentEgo !== this.ego
                  ? 'person_outline'
                  : 'person'}</mwc-icon
              >
            </wl-list-item>
          `
        : ''}
      <sl-details summary=${localize('aptitudes')} open>
        <ul class="aptitudes-list">
          ${enumValues(AptitudeType).map(this.renderAptitude)}
        </ul>
      </sl-details>

      <sl-details summary=${localize('skills')} open>
        <ul class="skills-list">
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
          ${active?.map(this.renderSkill)}
          ${notEmpty(know)
            ? html`
                <li class="divider" role="separator"></li>
                ${know.map(this.renderSkill)}
              `
            : ''}
        </ul>
      </sl-details>

      ${notEmpty(softwareSkills)
        ? html`
            <sl-details
              class="software-skills"
              summary="${localize('software')} ${localize('skills')}"
            >
              <ul class="software-list">
                ${softwareSkills.map(
                  (software) => html`
                    <li class="software">
                      <span class="software-name">${software.name}</span>
                      <ul class="skills-list">
                        ${software.skills.map((skill) => {
                          const { name, specialization, total } = skill;
                          return html`
                            <Wl-list-item
                              clickable
                              class="skill-item"
                              ?disabled=${this.disabled}
                              @click=${() =>
                                this.startSoftwareSkillTest(skill, software)}
                            >
                              <span class="skill-name"
                                >${name}
                                ${specialization
                                  ? `(${specialization})`
                                  : ''}</span
                              >
                              <span class="skill-total" slot="after"
                                >${total}</span
                              >
                            </Wl-list-item>
                          `;
                        })}
                      </ul>
                    </li>
                  `,
                )}
              </ul>
            </sl-details>
          `
        : ''}
      ${notEmpty(sources)
        ? html`
            <sl-details
              class="reputations"
              summary=${localize('reputations')}
              open
            >
              ${notEmpty(fakeIDs)
                ? html` <wl-list-item
                    clickable
                    @click=${this.openRepSourceMenu}
                    class="source"
                  >
                    <span slot="before">${localize('profile')}:</span>
                    <span> ${fakeID?.name ?? this.ego.name}</span>
                    <mwc-icon slot="after"
                      >${fakeID ? 'person_outline' : 'person'}</mwc-icon
                    >
                  </wl-list-item>`
                : ''}
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
                ${reps.map(this.renderRep)}
              </ul>
            </sl-details>
          `
        : ''}
    `;
  }

  private renderAptitude = (type: AptitudeType) => {
    const points = this.currentEgo.aptitudes[type];
    return html` <wl-list-item
      clickable
      ?disabled=${this.character.disabled}
      class="aptitude-item"
      @click=${() => this.startAptitudeTest(type)}
    >
      <span class="aptitude-name" slot="before"> ${localize(type)}</span>
      <span class="aptitude-points">${points}</span>
      <span class="aptitude-check" slot="after">
        <mwc-icon>check</mwc-icon> ${points * 3}</span
      >
    </wl-list-item>`;
  };

  private renderSkill = (skill: Skill) => {
    const filtered = this.skillFilterCheck(skill);
    return html` <wl-list-item
      clickable
      class="skill-item ${classMap({ filtered })}"
      ?disabled=${this.disabled}
      .tabIndex=${live(filtered ? -1 : 0)}
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
            <!-- ${rep.network} -->
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
