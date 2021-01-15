import { PoolType } from '@src/data-enums';
import type { Ego } from '@src/entities/actor/ego';
import type { Character } from '@src/entities/actor/proxies/character';
import {
  Action,
  ActionSubtype,
  ActionType,
  createAction,
} from '@src/features/actions';
import { matchesRep } from '@src/features/effects';
import {
  Favor,
  RepNetwork,
  RepWithIdentifier,
  favorValues,
  maxFavors,
} from '@src/features/reputations';
import { localize } from '@src/foundry/localization';
import type { WithUpdate } from '@src/utility/updating';
import { compact, merge } from 'remeda';
import { createSuccessTestModifier } from './success-test';
import { SuccessTestBase } from './success-test-base';

export type ReputationFavorInit = {
  ego: Ego;
  character: Character;
  reputation: RepWithIdentifier;
  favor?: Favor;
};

export class ReputationFavor extends SuccessTestBase {
  readonly ego;
  readonly character;

  readonly favorState: WithUpdate<{
    type: Favor;
    reputation: RepWithIdentifier;
    keepingQuiet: number;
    burnBonus: number;
  }> & { burnForAdditionalFavor: boolean };

  readonly keepingQuietModifier = createSuccessTestModifier({
    name: localize('keepingQuiet'),
  });

  readonly burnBonusModifier = createSuccessTestModifier({
    name: `${localize('burn')} ${localize('bonus')}`,
    icon: 'whatshot',
  });

  get basePoints() {
    return (
      this.favorState.reputation.score +
      favorValues(this.favorState.type).modifier
    );
  }

  get totalBurnedRepScore() {
    const { burnBonus, burnForAdditionalFavor, type } = this.favorState
    return burnBonus + (burnForAdditionalFavor ? favorValues(type).burnCost : 0)
  }

  constructor({
    ego,
    character,
    reputation,
    favor = Favor.Trivial,
  }: ReputationFavorInit) {
    super({
      action: createAction({
        type: ActionType.Task,
        subtype: ActionSubtype.Mesh,
        timeframe: favorValues(favor).timeframe,
      }),
    });
    this.ego = ego;
    this.character = character;
    this.favorState = {
      reputation,
      type: favor,
      keepingQuiet: 0,
      burnBonus: 0,
      burnForAdditionalFavor:
        favor !== Favor.Trivial &&
        reputation[favor] >= (maxFavors.get(favor) ?? 1),
      update: (change) => {
        this.update((draft) => {
          draft.favorState = merge(draft.favorState, change);
          if (change.type) {
            this.updateAction(draft, {
              timeframe: favorValues(change.type).timeframe,
            });
          }
          const {
            type,
            reputation,
            keepingQuiet,
            burnBonus,
          } = draft.favorState;
          draft.favorState.burnForAdditionalFavor =
            type !== Favor.Trivial &&
            reputation[type] >= (maxFavors.get(type) ?? 1);

          if (!keepingQuiet) {
            draft.modifiers.simple.delete(draft.keepingQuietModifier.id);
          } else if (change.keepingQuiet) {
            draft.keepingQuietModifier.value = keepingQuiet;
            draft.modifiers.simple.set(
              draft.keepingQuietModifier.id,
              draft.keepingQuietModifier,
            );
          }

          if (!burnBonus) {
            draft.modifiers.simple.delete(draft.burnBonusModifier.id);
          } else if (change.burnBonus) {
            draft.burnBonusModifier.value = burnBonus * 2;
            draft.modifiers.simple.set(
              draft.burnBonusModifier.id,
              draft.burnBonusModifier,
            );
          }
        });
      },
    };

    this.pools.available = this.getPools();
    this.modifiers.effects = this.getModifierEffects(
      this.favorState.reputation,
      this.action,
    );
  }

  private getModifierEffects(rep: RepWithIdentifier, action: Action) {
    return new Map(
      (
        this.character?.appliedEffects.getMatchingSuccessTestEffects(
          matchesRep(rep)(action),
          false,
        ) || []
      ).map((effect) => [effect, !effect.requirement]),
    );
  }

  private getPools() {
    const poolMap = this.character.pools;
    return compact(
      this.ego.useThreat
        ? [poolMap.get(PoolType.Threat)]
        : [poolMap.get(PoolType.Moxie), poolMap.get(PoolType.Flex)],
    );
  }

  protected async createMessage() {
    // TODO
  }
}
