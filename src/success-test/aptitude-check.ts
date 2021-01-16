import { createMessage } from '@src/chat/create-message';
import type { SuccessTestMessageData } from '@src/chat/message-data';
import { AptitudeType, PoolType } from '@src/data-enums';
import type { MaybeToken } from '@src/entities/actor/actor';
import type { Ego } from '@src/entities/actor/ego';
import type { Character } from '@src/entities/actor/proxies/character';
import {
  Action,
  actionTimeframeModifier,
  ActionType,
  createAction,
  defaultCheckActionSubtype,
} from '@src/features/actions';
import { matchesAptitude } from '@src/features/effects';
import { Pool } from '@src/features/pool';
import { localize } from '@src/foundry/localization';
import type { WithUpdate } from '@src/utility/updating';
import { compact, map, merge } from 'remeda';
import { rollSuccessTest } from './success-test';
import { SuccessTestBase } from './success-test-base';

export type AptitudeCheckInit = {
  ego: Ego;
  character?: Character;
  token?: MaybeToken;
  aptitude: AptitudeType;
  action?: Action;
};

export class AptitudeCheck extends SuccessTestBase {
  readonly ego;
  readonly character;
  readonly token;
  readonly aptitude: WithUpdate<{
    type: AptitudeType;
    multiplier: number;
  }>;

  get basePoints() {
    return Math.round(
      this.ego.aptitudes[this.aptitude.type] * this.aptitude.multiplier,
    );
  }

  constructor({ ego, character, token, aptitude, action }: AptitudeCheckInit) {
    super({
      action:
        action ??
        createAction({
          type: ActionType.Automatic,
          subtype: defaultCheckActionSubtype(aptitude),
        }),
    });
    this.ego = ego;
    this.character = character;
    this.token = token;
    this.aptitude = {
      type: aptitude,
      multiplier: 3,
      update: (change) => {
        this.update((draft) => {
          draft.aptitude = merge(draft.aptitude, change);
          if (!change.type) return;
          draft.pools.available = this.getPools(change.type);
          this.togglePool(draft, null);
          this.updateAction(
            draft,
            createAction({
              type: draft.action.type,
              subtype: defaultCheckActionSubtype(change.type),
            }),
          );
          draft.modifiers.effects = this.getModifierEffects(
            change.type,
            draft.action,
          );
        });
      },
    };

    this.pools.available = this.getPools(this.aptitude.type);
    this.modifiers.effects = this.getModifierEffects(
      this.aptitude.type,
      this.action,
    );
  }

  private getPools(aptitude: AptitudeType) {
    const poolMap = this.character?.pools;
    return compact(
      this.ego.useThreat
        ? [poolMap?.get(PoolType.Threat)]
        : [
            poolMap?.get(Pool.linkedToAptitude(aptitude)),
            poolMap?.get(PoolType.Flex),
          ],
    );
  }

  private getModifierEffects(aptitude: AptitudeType, action: Action) {
    return new Map(
      (
        this.character?.appliedEffects.getMatchingSuccessTestEffects(
          matchesAptitude(aptitude)(action),
          false,
        ) || []
      ).map((effect) => [effect, !effect.requirement]),
    );
  }

  protected async createMessage() {
    const {
      ignoreModifiers,
      clampedTarget,
      aptitude,
      settings,
      pools,
      action,
    } = this;

    const name = `${localize('FULL', aptitude.type)} ${localize('check')}`;

    const data: SuccessTestMessageData = {
      parts: compact([
        {
          name: `${localize(aptitude.type)} x${aptitude.multiplier}`,
          value: this.basePoints,
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
      linkedPool: Pool.linkedToAptitude(aptitude.type),
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

    await createMessage({
      data: {
        header: {
          heading: name,
          subheadings: [
            `${action.type} ${
              action.timeMod && action.type !== ActionType.Task
                ? `(${localize('as')} ${localize('task')})`
                : ''
            }`,
            localize(action.subtype),
            localize('action'),
          ].join(' '),
        },
        successTest: data,
      },
      entity: this.token ?? this.character, // TODO account for item sources,
      visibility: settings.visibility,
    });

    if (pools.active) {
      this.character?.spendPool({
        pool: pools.active[0].type,
        points: 1,
      });
    }
  }
}
