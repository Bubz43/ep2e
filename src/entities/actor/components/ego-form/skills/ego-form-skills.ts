import type { AnimatedList } from '@src/components/animated-list/animated-list';
import {
  renderLabeledSwitch,
  renderTextInput,
} from '@src/components/field/fields';
import { renderAutoForm } from '@src/components/form/forms';
import { enumValues } from '@src/data-enums';
import {
  addUpdateRemoveFeature,
  StringID,
} from '@src/features/feature-helpers';
import {
  FullSkill,
  FullFieldSkill,
  skillFilterCheck,
  SkillType,
  Skill,
  isFieldSkill,
  FieldSkillType,
} from '@src/features/skills';
import { localize } from '@src/foundry/localization';
import { debounceFn, throttleFn } from '@src/utility/decorators';
import { PropertyValues, query, TemplateResult } from 'lit-element';
import { customElement, LitElement, property, html } from 'lit-element';
import { repeat } from 'lit-html/directives/repeat';
import { identity, mapToObj, sort } from 'remeda';
import type { ArrayEntry } from 'type-fest/source/entry';
import type { Ego } from '../../../ego';
import styles from './ego-form-skills.scss';

enum SkillSort {
  Name = 0,
  NameReverse = 2,
  Points = 1,
  PointsReverse = 3,
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

  @query('.skills-list') private skillsList?: AnimatedList;

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

  disconnectedCallback() {
    this.groupedSkills = [];
    this.filteredSkills.clear();
    super.disconnectedCallback();
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
      if (controls.filter) this.skillsList?.scrollTo({ top: 0 });
    },
    200,
    false,
  );

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

  render() {
    const { disabled, updater } = this.ego;
    const { editTotals } = this.skillControls;

    return html`
      ${renderAutoForm({
        props: this.skillControls,
        update: this.updateSkillControls,
        storeOnInput: true,
        fields: ({ filter, editTotals }) => [
          renderTextInput(filter, {
            search: true,
            placeholder: `${localize('filter')} ${localize('skills')}`,
          }),
          renderLabeledSwitch(editTotals),
        ],
      })}
      <sl-animated-list class="skills-list">
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
