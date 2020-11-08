import type { AnimatedList } from '@src/components/animated-list/animated-list';
import type { StringID } from '@src/features/feature-helpers';
import { FullSkill, FullFieldSkill, skillFilterCheck } from '@src/features/skills';
import { localize } from '@src/foundry/localization';
import { query, TemplateResult } from 'lit-element';
import { customElement, LitElement, property, html } from 'lit-element';
import type { Ego } from '../../ego';
import styles from './ego-form-skills.scss';

const pointTracker = (name: "active" | "know") => ({
  points: 0,
  skills: 0,
  name,
  addPoints(points: number) {
    ++this.skills;
    this.points += points;
  },
});

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
    // sort: SkillSort.Name,
  };

  updateSkillControls = async (
    controls: Partial<EgoFormSkills['skillControls']>,
  ) => {
    this.skillControls = { ...this.skillControls, ...controls };
    await this.requestUpdate();
    if (controls.filter) this.skillsList?.scrollTo({ top: 0 });
  };

  render() {
    const { disabled, updater } = this.ego;
    const activeSkillTracker = pointTracker("active");
    const knowSkillTracker = pointTracker("know");

    const nonFieldSkills = new Map<FullSkill, SkillInfo>();
    const fullFieldSkills = new Map<FullFieldSkill, StringID<SkillInfo>>();

    const { editTotals, filter } = this.skillControls;
    const isFiltered = skillFilterCheck(filter);

    return html`
      <header class="skills-header">
      ${[activeSkillTracker, knowSkillTracker].map(
        ({ skills, points, name }) => html`
          <div class="skill-totals ${name}">
            <div class="group">
              <span class="label">${localize(name)} ${localize("skills")}</span>
              <div class="total-number">${skills}</div>
            </div>
            <div class="group">
              <span class="label">${localize("points")}</span>
              <div class="total-number">${points}</div>
            </div>
          </div>
        `
      )}
      </header>
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ego-form-skills': EgoFormSkills;
  }
}
