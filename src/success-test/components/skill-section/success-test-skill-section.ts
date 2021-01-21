import type { Ego } from '@src/entities/actor/ego';
import { Pool, poolIcon } from '@src/features/pool';
import {
  complementarySkillBonus,
  FieldSkillType,
  isFieldSkill,
} from '@src/features/skills';
import { localize } from '@src/foundry/localization';
import { openMenu } from '@src/open-menu';
import {
  skillLinkedAptitudeMultipliers,
  SkillState,
} from '@src/success-test/skill-test';
import { withSign } from '@src/utility/helpers';
import { customElement, html, LitElement, property } from 'lit-element';
import { compact } from 'remeda';
import styles from './success-test-skill-section.scss';

@customElement('success-test-skill-section')
export class SuccessTestSkillSection extends LitElement {
  static get is() {
    return 'success-test-skill-section' as const;
  }

  static get styles() {
    return [styles];
  }

  @property({ attribute: false }) ego!: Ego;

  @property({ attribute: false }) skillState!: SkillState;

  private openSkillSelect() {
    openMenu({
      header: { heading: `${localize('select')} ${localize('skill')}` },
      content: this.ego.skills.map((skill) => ({
        label: skill.fullName,
        callback: () => this?.skillState.replaceSkill(skill),
        icon: html`<img
          src=${poolIcon(Pool.linkedToAptitude(skill.linkedAptitude))}
        />`,
        activated: skill === this?.skillState.skill,
      })),
    });
  }

  private openComplementarySkillSelect() {
    const { complementarySkills } = this.ego;
    openMenu({
      header: {
        heading: `${localize('select')} ${localize('complementary')} ${localize(
          'skill',
        )}`,
      },
      content: compact([
        [
          {
            label: localize('clear'),
            callback: () => this?.skillState.setComplementarySkill(null),
          },
        ],
        complementarySkills?.map((skill) => ({
          label: skill.fullName,
          callback: () => this?.skillState.setComplementarySkill(skill),
          icon: html`<img
            src=${poolIcon(Pool.linkedToAptitude(skill.linkedAptitude))}
          />`,
          activated: skill === this?.skillState.complementarySkill,
        })),
      ]).flat(),
    });
  }
  render() {
    const {
      skill,
      applySpecialization,
      aptitudeMultiplier,
      halveBase,
      complementarySkill,
      toggleHalveBase,
      toggleSpecialization,
      cycleAptitudeMultiplier,
    } = this.skillState;
    return html`
      <div class="options">
        ${(isFieldSkill(skill) && skill.fieldSkill === FieldSkillType.Know) ||
        !this.ego.complementarySkills.length
          ? ''
          : html`
              <button
                title=${localize('complementary')}
                @click=${this.openComplementarySkillSelect}
              >
                <mwc-icon>support</mwc-icon>
              </button>
            `}
        <button
          title=${localize('halve')}
          class=${halveBase ? 'active' : ''}
          @click=${toggleHalveBase}
        >
          ÷2
        </button>
      </div>
      <ul class="skill-state">
        <wl-list-item clickable @click=${this.openSkillSelect}>
          <span>
            <span>${skill.name} ${halveBase ? '÷2' : ''}</span>
            <span class="category">${localize(skill.category)}</span></span
          >

          <span slot="after"
            >${Math.round(skill.points * (halveBase ? 0.5 : 1)) ||
            html`<span class="defaulting"
              >[${localize('defaulting')}]</span
            >`}</span
          >
        </wl-list-item>

        <wl-list-item clickable @click=${cycleAptitudeMultiplier}>
          <span
            >${localize('FULL', skill.linkedAptitude)} ${halveBase ? '÷2' : ''}
            (${Math.round(skill.aptitudePoints * (halveBase ? 0.5 : 1))})
            <span class="multipliers">
              ${skillLinkedAptitudeMultipliers.map(
                (mp) =>
                  html`<span class=${mp === aptitudeMultiplier ? 'active' : ''}
                    >x${mp}</span
                  >`,
              )}
            </span></span
          >
          <span slot="after"
            >${withSign(
              Math.round(
                skill.aptitudePoints *
                  aptitudeMultiplier *
                  (halveBase ? 0.5 : 1),
              ),
            )}</span
          >
        </wl-list-item>
        ${skill.specialization
          ? html`
              <wl-list-item clickable @click=${toggleSpecialization}>
                <mwc-checkbox
                  slot="before"
                  ?checked=${applySpecialization}
                ></mwc-checkbox>
                <span>
                  <span>${skill.specialization}</span>
                  <span class="category"
                    >${localize('specialization')}</span
                  ></span
                >
                <span slot="after">${withSign(10)}</span>
              </wl-list-item>
            `
          : ''}
        ${complementarySkill
          ? html`
              <wl-list-item>
                <span class="truncate"
                  ><span>${complementarySkill.name}</span>
                  <span class="category"
                    >${localize('complementary')}</span
                  ></span
                >
                <span slot="after"
                  >${withSign(
                    complementarySkillBonus(complementarySkill),
                  )}</span
                >
              </wl-list-item>
            `
          : ''}
      </ul>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'success-test-skill-section': SuccessTestSkillSection;
  }
}
