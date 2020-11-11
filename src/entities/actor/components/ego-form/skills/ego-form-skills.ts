import type { AnimatedList } from '@src/components/animated-list/animated-list';
import {
  renderLabeledSwitch,
  renderTextInput,
} from '@src/components/field/fields';
import { renderAutoForm } from '@src/components/form/forms';
import { enumValues } from '@src/data-enums';
import { addUpdateRemoveFeature } from '@src/features/feature-helpers';
import {
  FieldSkillType,
  FullFieldSkill,
  FullSkill,
  Skill,
  skillFilterCheck,
  SkillType,
} from '@src/features/skills';
import { localize } from '@src/foundry/localization';
import { openMenu } from '@src/open-menu';
import { debounce, debounceFn } from '@src/utility/decorators';
import type { FieldPropsRenderer } from '@src/utility/field-values';
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
import type { Ego } from '../../../ego';
import styles from './ego-form-skills.scss';

const renderControlFields: FieldPropsRenderer<
  EgoFormSkills['skillControls']
> = ({ filter, editTotals }) => [
  renderTextInput(filter, {
    search: true,
    placeholder: `${localize('filter')} ${localize('skills')}`,
  }),
];

enum SkillSort {
  Name = 'a-z',
  NameReverse = 'z-a',
  Points = 'mostPoints',
  PointsReverse = 'leastPoints',
}

const pointTracker = (name: 'active' | 'know') => ({
  points: 0,
  skills: 0,
  name,
  addPoints(points: number) {
    ++this.skills;
    this.points += points;
  },
  reset() {
    this.skills = 0;
    this.points = 0;
  },
});

const skillSort = (type: SkillSort): ((a: Skill, b: Skill) => number) => {
  switch (type) {
    case SkillSort.Name:
      return (a, b) => a.name.localeCompare(b.name);

    case SkillSort.NameReverse:
      return (a, b) => b.name.localeCompare(a.name);

    case SkillSort.Points:
      return (a, b) => b.points - a.points;

    case SkillSort.PointsReverse:
      return (a, b) => a.points - b.points;
  }
};

type SetupSkills = ([FullSkill] | [FullFieldSkill, string])[];

const uniqSkill = ([skill, id]: SetupSkills[number]) =>
  id ? `${(skill as FullFieldSkill).fieldSkill}-${id}` : skill.name;

@customElement('ego-form-skills')
export class EgoFormSkills extends LitElement {
  static get is() {
    return 'ego-form-skills' as const;
  }

  static styles = [styles];

  @property({ attribute: false }) ego!: Ego;

  @query('.skills-list') private skillsList!: AnimatedList;

  private groupedSkills: SetupSkills = [];

  private activeTracker = pointTracker('active');

  private knowTracker = pointTracker('know');

  private filteredSkills = new Set<Skill>();

  private fieldOperations = mapToObj(enumValues(FieldSkillType), (type) => [
    type,
    addUpdateRemoveFeature(
      () => this.ego.updater.prop('data', 'fieldSkills', type).commit,
    ),
  ]);

  private skillControls = {
    filter: '',
    editTotals: false,
    sort: SkillSort.Name,
  };

  private skillSort = skillSort(this.skillControls.sort);

  update(changedProps: PropertyValues) {
    if (changedProps.has('ego')) this.setupSkills();
    super.update(changedProps);
  }

  private setupSkills() {
    this.activeTracker.reset();
    this.knowTracker.reset();
    this.filteredSkills.clear();
    this.groupedSkills = [];
    const isFiltered = skillFilterCheck(this.skillControls.filter);

    for (const skillType of enumValues(SkillType)) {
      const skill = this.ego.getCommonSkill(skillType);
      this.activeTracker.addPoints(skill.points);
      this.groupedSkills.push([skill]);
      if (isFiltered(skill)) this.filteredSkills.add(skill);
    }

    for (const fieldSkill of enumValues(FieldSkillType)) {
      const count =
        fieldSkill === FieldSkillType.Know
          ? this.knowTracker
          : this.activeTracker;
      const fields = this.ego.epData.fieldSkills[fieldSkill];

      for (const field of fields) {
        const fullSkill = this.ego.getFieldSkill({ fieldSkill, ...field });
        count.addPoints(fullSkill.points);
        this.groupedSkills.push([fullSkill, field.id]);
        if (isFiltered(fullSkill)) this.filteredSkills.add(fullSkill);
      }
    }
  }

  updateSkillControls = debounceFn(
    async (controls: Partial<EgoFormSkills['skillControls']>) => {
      this.skillControls = { ...this.skillControls, ...controls };
      if (controls.sort) this.skillSort = skillSort(controls.sort);
      if (controls.filter !== undefined) this.setupFiltered();
      await this.requestUpdate();
      if (controls.filter) this.scrollListToTop();
    },
    200,
    false,
  );

  private scrollListToTop() {
    this.skillsList?.firstElementChild?.scrollIntoView({ block: 'end' });
  }

  private sortSkills = ([a]: SetupSkills[number], [b]: SetupSkills[number]) => {
    return (
      (this.skillControls.filter &&
        Number(this.filteredSkills.has(a)) -
          Number(this.filteredSkills.has(b))) ||
      this.skillSort(a, b)
    );
  };

  private setupFiltered() {
    const { groupedSkills } = this;
    const isFiltered = skillFilterCheck(this.skillControls.filter);
    this.filteredSkills.clear();

    for (const [skill] of groupedSkills) {
      if (isFiltered(skill)) this.filteredSkills.add(skill);
    }
  }

  private openSkillSortMenu() {
    openMenu({
      header: { heading: `${localize('skill')} ${localize('sort')}` },
      content: enumValues(SkillSort).map((sort) => ({
        label: localize(sort),
        callback: () => this.updateSkillControls({ sort }),
        activated: this.skillControls.sort === sort,
      })),
    });
  }

  private toggleTotalEdit() {
    this.skillControls.editTotals = !this.skillControls.editTotals;
    this.requestUpdate();
  }

  private requestFieldForm() {
    this.dispatchEvent(
      new CustomEvent('open-field-form', { bubbles: true, composed: true }),
    );
  }

  render() {
    const { disabled, updater } = this.ego;
    const { editTotals } = this.skillControls;
    return html`
      <header>
        <div class="totals">
          ${[this.activeTracker, this.knowTracker].map(
            (tracker) => html`
              <div class="tracker">
                <span class="skill-count">${tracker.skills}</span>
                <span class="group">${localize(tracker.name)}</span>
                <span class="points-label"
                  >${localize('points').toLocaleLowerCase()}:
                  <span class="points">${tracker.points}</span></span
                >
              </div>
            `,
          )}
        </div>

        <mwc-button
          @click=${this.requestFieldForm}
          class="add-field-button"
          dense
          icon="add"
          label=${localize('field')}
          ?disabled=${disabled}
        ></mwc-button>

        <div class="controls">
          <mwc-icon-button
            icon="sort"
            @click=${this.openSkillSortMenu}
          ></mwc-icon-button>
          ${renderAutoForm({
            props: this.skillControls,
            update: this.updateSkillControls,
            storeOnInput: true,
            fields: renderControlFields,
          })}
          <span>${localize('points')}</span>
          <span class="total-label"
            >${localize('total')}
            ${disabled
              ? ''
              : html` <mwc-icon-button
                  class="edit-toggle ${classMap({ active: editTotals })}"
                  icon="edit"
                  tabindex="-1"
                  @click=${this.toggleTotalEdit}
                ></mwc-icon-button>`}
          </span>
        </div>
      </header>

      <sl-animated-list class="skills-list" stagger>
        ${repeat(
          this.groupedSkills.sort(this.sortSkills),
          uniqSkill,
          ([skill, id]) =>
            id
              ? html`
                  <ego-form-field-skill
                    ?editTotal=${editTotals}
                    .skill=${skill as FullFieldSkill}
                    skillId=${id}
                    ?filtered=${this.filteredSkills.has(skill)}
                    ?disabled=${disabled}
                    .operations=${this.fieldOperations[
                      (skill as FullFieldSkill).fieldSkill
                    ]}
                  ></ego-form-field-skill>
                `
              : html`
                  <ego-form-skill
                    ?editTotal=${editTotals}
                    .skill=${skill as FullSkill}
                    ?disabled=${disabled}
                    ?filtered=${this.filteredSkills.has(skill)}
                    .skillUpdate=${updater.prop(
                      'data',
                      'skills',
                      (skill as FullSkill).skill,
                    ).commit}
                  ></ego-form-skill>
                `,
        )}
      </sl-animated-list>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ego-form-skills': EgoFormSkills;
  }
}
