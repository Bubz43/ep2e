import type { AnimatedList } from '@src/components/animated-list/animated-list';
import { query } from 'lit-element';
import { customElement, LitElement, property, html } from 'lit-element';
import type { Ego } from '../../ego';
import styles from './ego-form-skills.scss';

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
}

declare global {
  interface HTMLElementTagNameMap {
    'ego-form-skills': EgoFormSkills;
  }
}
