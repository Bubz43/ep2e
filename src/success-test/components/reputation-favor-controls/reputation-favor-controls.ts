import { renderNumberField } from '@src/components/field/fields';
import { renderAutoForm } from '@src/components/form/forms';
import type { SlWindow } from '@src/components/window/window';
import { enumValues } from '@src/data-enums';
import type { ActorEP, MaybeToken } from '@src/entities/actor/actor';
import type { Ego } from '@src/entities/actor/ego';
import type { Character } from '@src/entities/actor/proxies/character';
import { formattedSleeveInfo } from '@src/entities/actor/sleeves';
import {
  Favor,
  favorValues,
  maxFavors,
  RepWithIdentifier
} from '@src/features/reputations';
import { localize } from '@src/foundry/localization';
import { overlay } from '@src/init';
import { openMenu } from '@src/open-menu';
import { ReputationFavor } from '@src/success-test/reputation-favor';
import { notEmpty, withSign } from '@src/utility/helpers';
import {
  customElement,


  html,
  internalProperty, LitElement,




  PropertyValues, query
} from 'lit-element';
import type { Subscription } from 'rxjs';
import { traverseActiveElements } from 'weightless';
import styles from './reputation-favor-controls.scss';

type Init = {
  entities: ReputationFavorControls['entities'];
  getState: ReputationFavorControls['getState'];
};

@customElement('reputation-favor-controls')
export class ReputationFavorControls extends LitElement {
  static get is() {
    return 'reputation-favor-controls' as const;
  }

  static get styles() {
    return [styles];
  }

  private static readonly openWindows = new WeakMap<
    ActorEP,
    ReputationFavorControls
  >();

  static openWindow(init: Init) {
    let win = ReputationFavorControls.openWindows.get(init.entities.actor);

    if (!win) {
      win = new ReputationFavorControls();
      overlay.append(win);
      ReputationFavorControls.openWindows.set(init.entities.actor, win);
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
    character: Character;
    reputation: RepWithIdentifier;
    favor: Favor;
    // TODO Item source
  } | null;

  @query('sl-window')
  private win?: SlWindow;

  private subs = new Set<Subscription | Subscription['unsubscribe']>();

  @internalProperty() private test?: ReputationFavor;

  update(changedProps: PropertyValues) {
    if (changedProps.has('entities')) {
      this.unsub();
      this.subs.add(
        this.entities.actor.subscribe((actor) => {
          const info = actor && this.getState(actor);
          if (!info) this.win?.close();
          else {
            this.subs.add(
              new ReputationFavor({
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
    ReputationFavorControls.openWindows.delete(this.entities.actor);
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

  private openReputationSelect() {
    openMenu({
      header: { heading: `${localize('select')} ${localize('network')}` },
      content: (this.test?.ego.trackedReps ?? []).map((reputation) => ({
        label: reputation.network,
        callback: () => this.test?.favorState.update({ reputation }),
        activated: reputation === this.test?.favorState.reputation,
      })),
    });
  }

  private openFavorSelect() {
    const state = this.test?.favorState;
    const burnLabel = (favor: Favor) => {
      if (favor === Favor.Trivial) return undefined;
      const used = state?.reputation[favor] ?? 0;
      const max = maxFavors.get(favor) ?? 0;
      return used >= max
        ? `${localize('burn')} ${favorValues(favor).burnCost} ${localize(
            'rep',
          )}`
        : undefined;
    };
    openMenu({
      header: { heading: `${localize('select')} ${localize('favor')}` },
      content: enumValues(Favor).map((type) => ({
        label: localize(type),
        callback: () => state?.update({ type }),
        activated: state?.type === type,
        sublabel: burnLabel(type),
      })),
    });
  }

  render() {
    return html`
      <sl-window
        name="${localize('successTest')} - ${localize('reputation')} ${localize(
          'favor',
        )}"
        @sl-window-closed=${this.remove}
        noremove
      >
        ${this.test
          ? html`<div class="controls">${this.renderTest(this.test)}</div>`
          : ''}
      </sl-window>
    `;
  }

  private renderTest(test: NonNullable<ReputationFavorControls['test']>) {
    const { entities } = this;
    const { character, ego, action, pools, target, totalBurnedRepScore } = test;
    const {
      reputation,
      type,
      keepingQuiet,
      burnBonus,
      burnForAdditionalFavor,
    } = test.favorState;
    // TODO show total burning
    return html`
      <mwc-list-item
        class="entity"
        @click=${() => character.actor.sheet.render(true)}
        graphic="medium"
        ?twoline=${!!character.sleeve}
      >
        <img slot="graphic" src=${entities.token?.data.img ?? character.img} />
        <span>${entities.token?.data.name ?? character.name} </span>
        ${character.sleeve
          ? html`<span slot="secondary"
              >${formattedSleeveInfo(character.sleeve).join(' - ')}</span
            >`
          : ''}
      </mwc-list-item>

      <div class="sections">
        <section class="favor-section">
          <success-test-section-label
            >${localize('favor')}</success-test-section-label
          >

          <div>
            <ul class="favor-info">
              <wl-list-item clickable @click=${this.openReputationSelect}>
                <span
                  >${reputation.network}
                  <span class="acronym">${reputation.acronym}</span></span
                >
                <span slot="after">${reputation.score}</span>
              </wl-list-item>
              <wl-list-item clickable @click=${this.openFavorSelect}>
                <span>${localize(type)} ${localize('favor')}</span>
                ${burnForAdditionalFavor
                  ? html`
                      <small
                        >${localize('burning')}
                        <b>${favorValues(type).burnCost}</b> ${localize('rep')}
                        ${localize('score')} ${localize('to')}
                        ${localize('use')}</small
                      >
                    `
                  : ''}
                <span slot="after"
                  >${withSign(favorValues(type).modifier)}</span
                >
              </wl-list-item>
            </ul>
            ${renderAutoForm({
              noDebounce: true,
              storeOnInput: true,
              props: { keepingQuiet, burnBonus },
              update: test.favorState.update,
              fields: ({ keepingQuiet, burnBonus }) => [
                renderNumberField(keepingQuiet, { max: 0 }),
                renderNumberField(
                  {
                    ...burnBonus,
                    label: `${localize('burn')} ${localize('bonus')}`,
                  },
                  { min: 0, max: 15 },
                ),
              ],
            })}
            ${totalBurnedRepScore
              ? html`
                  <div class="total-burn">
                    ${localize('permanently')} ${localize('burning')}
                    <b>${totalBurnedRepScore}</b> ${localize('rep')}
                    ${localize('score')}
                  </div>
                `
              : ''}
          </div>
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
    'reputation-favor-controls': ReputationFavorControls;
  }
}
