import type { Character } from '@src/entities/actor/proxies/character';
import { ActorType } from '@src/entities/entity-types';
import { UpdateStore } from '@src/entities/update-store';
import { CommonInterval } from '@src/features/time';
import { localize } from '@src/foundry/localization';
import {
  isGamemaster,
  updateManyActors,
  gmIsConnected,
  activeCanvas,
} from '@src/foundry/misc-helpers';
import { EP } from '@src/foundry/system';
import { activeTokenStatusEffects } from '@src/foundry/token-helpers';
import { debounceFn } from '@src/utility/decorators';
import { whenNotEmpty } from '@src/utility/helpers';
import { render, html } from 'lit-html';
import { createPipe, map, forEach, pipe } from 'remeda';
import type { DeepPartial } from 'utility-types';
import { Combatant, CombatantHelpers, isSurpriseRound } from './combatant';

const processedRounds = new WeakMap<Combat, number>();
export const onCombatUpdate = async () => {
  const { combat } = game;
  if (!combat || !isGamemaster()) return;

  const { round, turn, previous } = combat;

  // * If it is a new round and it hasn't been processed
  if (
    processedRounds.get(combat) !== round &&
    round > 1 &&
    turn === 0 &&
    (previous.round || 0) < round
  ) {
    processedRounds.set(combat, round);
    const characters = new Set<Character>();
    const toDelete: string[] = [];
    const tookInit: Combatant[] = [];

    for (const combatant of combat.combatants) {
      const { temporary, tookInitiative } = CombatantHelpers.flags(combatant);
      if (temporary) {
        toDelete.push(combatant._id);
        continue;
      }
      if (combatant.actor?.agent.type === ActorType.Character) {
        characters.add(combatant.actor.agent);
      }

      if (tookInitiative) tookInit.push(combatant);
    }

    await whenNotEmpty(toDelete, (ids) =>
      combat.deleteEmbeddedEntity('Combatant', ids),
    );
    await whenNotEmpty(
      tookInit,
      createPipe(
        map(CombatantHelpers.updater),
        forEach(
          (updater) =>
            updater
              .prop('initiative')
              .store((i) =>
                String(
                  parseFloat(i || '0') -
                    CombatantHelpers.tempTakeInitiativeBonus,
                ),
              )
              .prop('flags', EP.Name, 'tookInitiative')
              .store(false),
          // .prop("flags", EP.Name, "nonPhysical")
          // .store(false)
        ),
        UpdateStore.prepUpdateMany,
        CombatantHelpers.updateMany,
      ),
    );
    await pipe(
      [...characters],
      map((character) => {
        character.storeTimeAdvance(CommonInterval.Turn);
        return character.actor;
      }),
      updateManyActors,
    );
  }
};

export const onCombatTrackerRender = (_: CombatTracker, [el]: JQuery) => {
  // pulseCombatant();
  if (isSurpriseRound()) {
    const roundTitle = el.querySelector<HTMLElement>('.encounters h3');
    if (roundTitle) {
      const surpriseLabel = document.createElement('div');
      surpriseLabel.textContent = `${localize('surprise')} ${localize(
        'round',
      )}`;
      surpriseLabel.classList.add('surprise-label');
      roundTitle.append(surpriseLabel);
    }
  }

  const { combat } = game;

  if (gmIsConnected() && combat) {
    el.querySelectorAll<HTMLElement>('.token-initiative').forEach((el) => {
      const combatentEl = el.closest<HTMLElement>('.combatant')!;
      const { combatantId } = combatentEl.dataset;
      const combatant = combatantId ? CombatantHelpers.get(combatantId) : null;
      if (combatant?.actor?.agent.type === ActorType.Character) {
        render(
          html`
            <initiative-controls
              .combat=${combat}
              .combatant=${combatant}
              .character=${combatant.actor.agent}
              .innerHTML=${el.innerHTML}
              ?disabled=${!combatant.owner}
            ></initiative-controls>
          `,
          el,
        );
        const tokenEffects = combatentEl.querySelector<HTMLElement>(
          '.token-effects',
        );
        const token = activeCanvas()?.tokens.get(combatant.tokenId);
        if (tokenEffects && token) {
          render(
            html`${activeTokenStatusEffects(token).map(
              (effect) => html`<img class="token-effect" src=${effect} />`,
            )}`,
            tokenEffects,
          );
        }
      }
    });
  }
};
