import type { AnimatedList } from '@src/components/animated-list/animated-list';
import {
  renderLabeledSwitch,
  renderTextInput,
} from '@src/components/field/fields';
import { renderAutoForm } from '@src/components/form/forms';
import { enumValues } from '@src/data-enums';
import type { StringID } from '@src/features/feature-helpers';
import {
  FullSkill,
  FullFieldSkill,
  skillFilterCheck,
  SkillType,
  Skill,
  isFieldSkill,
} from '@src/features/skills';
import { localize } from '@src/foundry/localization';
import { debounceFn, throttleFn } from '@src/utility/decorators';
import { query, TemplateResult } from 'lit-element';
import { customElement, LitElement, property, html } from 'lit-element';
import { repeat } from 'lit-html/directives/repeat';
import { identity, sort } from 'remeda';
import type { Ego } from '../../ego';
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

type SkillInfo = {
  filtered: boolean;
  template: TemplateResult;
};

@customElement('ego-form-skills')
export class EgoFormSkills extends LitElement {
  static get is() {
    return 'ego-form-skills' as const;
  }

  static styles = [styles];

  @property({ attribute: false }) ego!: Ego;

  @query('.skills-list') private skillsList?: AnimatedList;

  private skillControls = {
    filter: '',
    editTotals: false,
    sort: SkillSort.Name,
  };

  updateSkillControls = debounceFn(async (
    controls: Partial<EgoFormSkills['skillControls']>,
  ) => {
    this.skillControls = { ...this.skillControls, ...controls };
    await this.requestUpdate();
    if (controls.filter) this.skillsList?.scrollTo({ top: 0 });
  }, 200, false);

  render() {
    const { disabled, updater } = this.ego;
    const activeSkillTracker = pointTracker('active');
    const knowSkillTracker = pointTracker('know');

    const nonFieldSkills: [FullSkill, SkillInfo][] = [];
    const fullFieldSkills: [FullFieldSkill, StringID<SkillInfo>][] = [];

    const { editTotals, filter, sort: sortType } = this.skillControls;
    const isFiltered = skillFilterCheck(filter);

    for (const skillType of enumValues(SkillType)) {
      const skill = this.ego.getCommonSkill(skillType);
      const filtered = isFiltered(skill);
      activeSkillTracker.addPoints(skill.points);
      nonFieldSkills.push([
        skill,
        {
          filtered,
          template: html`
            <ego-form-skill
              .skill=${skill}
              ?disabled=${disabled}
              ?filtered=${isFiltered(skill)}
              ?editTotal=${editTotals}
            ></ego-form-skill>
          `,
        },
      ]);
    }

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
          sort(
            [...nonFieldSkills, ...fullFieldSkills],
            ([a, aInfo], [b, bInfo]) =>
              Number(aInfo.filtered) - Number(bInfo.filtered) ||
              skillSort(sortType)(a, b),
          ),
          ([skill, info]) =>
            'id' in info && isFieldSkill(skill)
              ? `${skill.fieldSkill}-${info.id}`
              : skill.name,
          ([, { template }]) => template,
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
