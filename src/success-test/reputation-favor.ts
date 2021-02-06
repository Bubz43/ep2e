import { createMessage } from '@src/chat/create-message';
import type { SuccessTestMessageData } from '@src/chat/message-data';
import { PoolType, SuperiorResultEffect } from '@src/data-enums';
import type { Ego } from '@src/entities/actor/ego';
import type { Character } from '@src/entities/actor/proxies/character';
import type { PhysicalService } from '@src/entities/item/proxies/physical-service';
import {
  Action,
  ActionSubtype,
  actionTimeframeModifier,
  ActionType,
  createAction,
} from '@src/features/actions';
import { matchesRep } from '@src/features/effects';
import { updateFeature } from '@src/features/feature-helpers';
import {
  Favor,
  RepNetwork,
  RepWithIdentifier,
  favorValues,
  maxFavors,
} from '@src/features/reputations';
import { localize } from '@src/foundry/localization';
import { arrayOf } from '@src/utility/helpers';
import type { WithUpdate } from '@src/utility/updating';
import produce from 'immer';
import { compact, last, map, merge } from 'remeda';
import {
  createSuccessTestModifier,
  grantedSuperiorResultEffects,
  rollSuccessTest,
  successTestEffectMap,
} from './success-test';
import { SuccessTestBase } from './success-test-base';

export type ReputationFavorInit = {
  ego: Ego;
  character: Character;
  reputation: RepWithIdentifier;
  favor?: Favor;
  fakeID?: PhysicalService;
};

export class ReputationFavor extends SuccessTestBase {
  readonly ego;
  readonly character;

  readonly favorState: WithUpdate<{
    type: Favor;
    reputation: RepWithIdentifier;
    keepingQuiet: number;
    burnBonus: number;
    fakeID?: PhysicalService | null;
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
    const { burnBonus, burnForAdditionalFavor, type } = this.favorState;
    return (
      burnBonus + (burnForAdditionalFavor ? favorValues(type).burnCost : 0)
    );
  }

  constructor({
    ego,
    character,
    reputation,
    favor = Favor.Trivial,
    fakeID,
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
      fakeID,
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
    return successTestEffectMap(
      this.character?.appliedEffects.getMatchingSuccessTestEffects(
        matchesRep(rep)(action),
        false,
      ) || [],
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
    const {
      ignoreModifiers,
      clampedTarget,
      favorState,
      settings,
      pools,
      action,
      totalBurnedRepScore,
    } = this;

    const {
      type,
      reputation,
      fakeID,
      keepingQuiet,
      burnForAdditionalFavor,
    } = favorState;

    const name = `${reputation.network} ${localize(type)} ${localize('favor')}`;

    const data: SuccessTestMessageData = {
      parts: compact([
        {
          name: reputation.network,
          value: reputation.score,
        },
        {
          name: localize(type),
          value: favorValues(type).modifier,
        },
        ...(ignoreModifiers ? [] : this.modifiersAsParts),
      ]),
      states: [
        {
          target: clampedTarget,
          ...(settings.autoRoll
            ? rollSuccessTest({ target: clampedTarget })
            : {}),
          action: pools.active
            ? [pools.active[0].type, pools.active[1]]
            : 'initial',
        },
      ],
      ignoredModifiers: ignoreModifiers ? this.modifierTotal : undefined,
      linkedPool: PoolType.Moxie,
      task: action.timeframe
        ? {
            name,
            timeframe: action.timeframe,
            actionSubtype: action.subtype,
            modifiers: [actionTimeframeModifier(action)].flatMap((p) =>
              p.modifier ? { ...p, modifier: p.modifier * 100 } : [],
            ),
          }
        : undefined,
    };

    if (data.task) {
      (data.defaultSuperiorEffect = SuperiorResultEffect.Time),
        (data.superiorResultEffects = arrayOf({
          value: SuperiorResultEffect.Time,
          length: grantedSuperiorResultEffects(last(data.states)?.result),
        }));
    }

    await createMessage({
      data: {
        header: {
          heading: name,
          subheadings: compact([
            [
              `${action.type} ${
                action.timeMod && action.type !== ActionType.Task
                  ? `(${localize('as')} ${localize('task')})`
                  : ''
              }`,
              localize(action.subtype),
              localize('action'),
            ].join(' '),
            fakeID &&
              `${localize('using')} ${localize('fakeId')}: ${fakeID.name} `,
          ]),
        },
        successTest: data,
        favor: {
          type,
          repIdentifier: reputation.identifier,
          keepingQuiet,
          repAcronym: reputation.acronym,
          burnedRep: burnForAdditionalFavor,
          fakeIdName: fakeID?.name,
        },
      },
      entity: this.character, // TODO account for item sources,
      visibility: settings.visibility,
    });

    this.character.updater.batchCommits(() => {
      if (pools.active) {
        this.character?.modifySpentPools({
          pool: pools.active[0].type,
          points: 1,
        });
      }
      if (totalBurnedRepScore) {
        const newScore = reputation.score - totalBurnedRepScore;
        if (reputation.identifier.type === 'ego') {
          this.ego.updater
            .path('data', 'reps', reputation.identifier.networkId)
            .commit({ score: newScore });
        } else {
          const { fakeEgoId, repId } = reputation.identifier;
          this.character?.equippedGroups.fakeIDs
            .find((f) => f.id === fakeEgoId)
            ?.updater.path('data', 'reputations')
            .commit((reps) =>
              updateFeature(reps, { id: repId, score: newScore }),
            );
        }
      }
    });
  }
}
