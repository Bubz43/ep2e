import type { SlWindow } from '@src/components/window/window';
import type { ActorEP, MaybeToken } from '@src/entities/actor/actor';
import type { Ego } from '@src/entities/actor/ego';
import type { Character } from '@src/entities/actor/proxies/character';
import { formattedSleeveInfo } from '@src/entities/actor/sleeves';
import { Pool, poolIcon } from '@src/features/pool';
import {
  complementarySkillBonus,
  FieldSkillType,
  isFieldSkill,
  Skill,
} from '@src/features/skills';
import { localize } from '@src/foundry/localization';
import { overlay } from '@src/init';
import { openMenu } from '@src/open-menu';
import {
  skillLinkedAptitudeMultipliers,
  SkillTest,
} from '@src/success-test/skill-test';
import { notEmpty, withSign } from '@src/utility/helpers';
import {
  customElement,
  html,
  internalProperty,
  LitElement,
  PropertyValues,
  query,
} from 'lit-element';
import { compact } from 'remeda';
import type { Subscription } from 'rxjs';
import { traverseActiveElements } from 'weightless';
import styles from './skill-test-controls.scss';

type Init = {
  entities: SkillTestControls['entities'];
  getState: SkillTestControls['getState'];
};

@customElement('skill-test-controls')
export class SkillTestControls extends LitElement {
  static get is() {
    return 'skill-test-controls' as const;
  }

  static get styles() {
    return [styles];
  }

  private static readonly openWindows = new WeakMap<
    ActorEP,
    SkillTestControls
  >();

  static openWindow(init: Init) {
    let win = SkillTestControls.openWindows.get(init.entities.actor);

    if (!win) {
      win = new SkillTestControls();
      overlay.append(win);
      SkillTestControls.openWindows.set(init.entities.actor, win);
    }
    const source = traverseActiveElements();
    if (source instanceof HTMLElement) {
      requestAnimationFrame(() => win!.win?.positionAdjacentToElement(source));
    }
    win.setState(init);
  }

  @internalProperty() private entities!: {
    actor: ActorEP;
    token?: MaybeToken;
  };

  @internalProperty() private getState!: (
    actor: ActorEP,
  ) => {
    ego: Ego;
    character?: Character;
    skill: Skill;
    // TODO Item source
  } | null;

  @query('sl-window')
  private win?: SlWindow;

  private subs = new Set<Subscription | Subscription['unsubscribe']>();

  @internalProperty() private test?: SkillTest;

  update(changedProps: PropertyValues) {
    if (changedProps.has('entities')) {
      this.unsub();
      this.subs.add(
        this.entities.actor.subscribe((actor) => {
          const info = actor && this.getState(actor);
          if (!info) this.win?.close();
          else {
            this.subs.add(
              new SkillTest({
                ...info,
              }).subscribe({
                next: (test) => (this.test = test),
                complete: () => this.win?.close(),
              }),
            );
          }
        }),
      );
    }

    super.update(changedProps);
  }

  disconnectedCallback() {
    this.unsub();
    SkillTestControls.openWindows.delete(this.entities.actor);
    super.disconnectedCallback();
  }

  private unsub() {
    this.subs.forEach((unsub) => {
      if ('unsubscribe' in unsub) unsub.unsubscribe();
      else unsub();
    });
    this.subs.clear();
  }

  setState(init: Init) {
    this.entities = init.entities;
    this.getState = init.getState;
  }

  private openSkillSelect() {
    if (!this.test?.ego) return;
    openMenu({
      header: { heading: `${localize('select')} ${localize('skill')}` },
      content: this.test.ego.skills.map((skill) => ({
        label: skill.fullName,
        callback: () => this.test?.skillState.replaceSkill(skill),
        icon: html`<img
          src=${poolIcon(Pool.linkedToAptitude(skill.linkedAptitude))}
        />`,
        activated: skill === this.test?.skillState.skill,
      })),
    });
  }

  private openComplementarySkillSelect() {
    const { complementarySkills } = this.test?.ego ?? {};
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
            callback: () => this.test?.skillState.setComplementarySkill(null),
          },
        ],
        complementarySkills?.map((skill) => ({
          label: skill.fullName,
          callback: () => this.test?.skillState.setComplementarySkill(skill),
          icon: html`<img
            src=${poolIcon(Pool.linkedToAptitude(skill.linkedAptitude))}
          />`,
          activated: skill === this.test?.skillState.complementarySkill,
        })),
      ]).flat(),
    });
  }

  render() {
    return html`
      <sl-window
        name="${localize('successTest')} - ${localize('skillTest')}"
        @sl-window-closed=${this.remove}
        noremove
      >
        ${this.test
          ? html`<div class="controls">${this.renderTest(this.test)}</div>`
          : ''}
      </sl-window>
    `;
  }

  private renderTest(test: NonNullable<SkillTestControls['test']>) {
    const { entities } = this;
    const { character, ego, action, pools, target } = test;
    const {
      skill,
      applySpecialization,
      aptitudeMultiplier,
      halveBase,
      complementarySkill,
      toggleHalveBase,
      toggleSpecialization,
      cycleAptitudeMultiplier,
    } = test.skillState;
    return html`
      ${character
        ? html`
            <mwc-list-item
              class="entity"
              @click=${() => character.actor.sheet.render(true)}
              graphic="medium"
              ?twoline=${!!character.sleeve}
            >
              <img
                slot="graphic"
                src=${entities.token?.data.img ?? character.img}
              />
              <span>${entities.token?.data.name ?? character.name} </span>
              ${character.sleeve
                ? html`<span slot="secondary"
                    >${formattedSleeveInfo(character.sleeve).join(' - ')}</span
                  >`
                : ''}
            </mwc-list-item>
          `
        : ''}

      <div class="sections">
        <section class="skill-section">
          <div class="options">
            ${(isFieldSkill(skill) &&
              skill.fieldSkill === FieldSkillType.Know) ||
            !ego.complementarySkills.length
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
              <!-- ➗ -->
              ÷2
            </button>
          </div>
          <success-test-section-label
            >${localize('skill')}</success-test-section-label
          >
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
                >${localize('FULL', skill.linkedAptitude)}
                ${halveBase ? '÷2' : ''}
                (${Math.round(skill.aptitudePoints * (halveBase ? 0.5 : 1))})
                <span class="multipliers">
                  ${skillLinkedAptitudeMultipliers.map(
                    (mp) =>
                      html`<span
                        class=${mp === aptitudeMultiplier ? 'active' : ''}
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
        </section>
        <section class="actions">
          <success-test-section-label
            >${localize('action')}</success-test-section-label
          >
          <success-test-action-form
            .action=${action}
          ></success-test-action-form>
        </section>
        ${notEmpty(pools.available)
          ? html`
              <section class="pools">
                <success-test-section-label
                  >${localize('pools')}</success-test-section-label
                >
                <success-test-pool-controls
                  .poolState=${pools}
                ></success-test-pool-controls>
              </section>
            `
          : ''}
      </div>

      <success-test-modifiers-section
        class="modifiers"
        ?ignored=${test.ignoreModifiers}
        total=${test.modifierTotal}
        .modifierStore=${test.modifiers}
      ></success-test-modifiers-section>

      <success-test-footer
        class="footer"
        target=${target}
        .settings=${test.settings}
      ></success-test-footer>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'skill-test-controls': SkillTestControls;
  }
}
