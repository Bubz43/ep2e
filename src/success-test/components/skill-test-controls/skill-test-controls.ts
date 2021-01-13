import type { SlWindow } from '@src/components/window/window';
import type { ActorEP, MaybeToken } from '@src/entities/actor/actor';
import type { Ego } from '@src/entities/actor/ego';
import type { Character } from '@src/entities/actor/proxies/character';
import { formattedSleeveInfo } from '@src/entities/actor/sleeves';
import { Action, ActionType, createAction } from '@src/features/actions';
import type { Skill } from '@src/features/skills';
import { localize } from '@src/foundry/localization';
import { overlay } from '@src/init';
import { CoolStore } from 'cool-store';
import {
  customElement,
  html,
  internalProperty,
  LitElement,
  PropertyValues,
  query,
} from 'lit-element';
import { traverseActiveElements } from 'weightless';
import './action-form';
import styles from './skill-test-controls.scss';

type Init = {
  skill: Skill;
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
    win.setState(init);
    const source = traverseActiveElements();
    if (source instanceof HTMLElement) {
      requestAnimationFrame(() => win!.win?.positionAdjacentToElement(source));
    }
  }

  @internalProperty() private skill!: Skill;

  @internalProperty() private entities!: {
    actor: ActorEP;
    token?: MaybeToken;
  };

  @internalProperty() private getState!: (
    actor: ActorEP,
  ) => {
    ego: Ego;
    character?: Character;
  } | null;

  @query('sl-window')
  private win?: SlWindow;

  private unsubs = new Set<(() => void) | { unsubscribe: () => void }>();

  @internalProperty() private test?: {
    character?: Character;
    ego: Ego;
    action: CoolStore<Action>;
  };

  connectedCallback() {
    this.unsubs.add(
      this.entities.actor.subscribe((actor) => {
        const state = actor && this.getState(actor);
        if (!state) this.win?.close();
        else {
          this.test = {
            ...state,
            action: new CoolStore(createAction({ type: ActionType.Quick })),
          };

          this.unsubs.add(
            this.test.action
              .getChanges()
              .subscribe((state) => console.log(state)),
          );
        }
      }),
    );
    super.connectedCallback();
  }

  disconnectedCallback() {
    this.unsubs.forEach((unsub) => {
      if ('unsubscribe' in unsub) unsub.unsubscribe();
      else unsub();
    });
    this.unsubs.clear();
    SkillTestControls.openWindows.delete(this.entities.actor);
    super.disconnectedCallback();
  }

  setState(init: Init) {
    this.skill = init.skill;
    this.entities = init.entities;
    this.getState = init.getState;
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
    const { skill, entities } = this;
    const { character, ego } = test;
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
        <section>
          <success-test-section-label
            >${localize('skill')}</success-test-section-label
          >
        </section>
        <section class="actions">
          <success-test-section-label
            >${localize('action')}</success-test-section-label
          >
          <st-action-form .actionStore=${test.action}></st-action-form>
        </section>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'skill-test-controls': SkillTestControls;
  }
}
