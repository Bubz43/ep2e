import { createMessage } from '@src/chat/create-message';
import type {
  SpecialTestData,
  SuccessTestMessageData,
} from '@src/chat/message-data';
import { AptitudeType, PoolType, SuperiorResultEffect } from '@src/data-enums';
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
import { ArmorType } from '@src/features/active-armor';
import { createEffect, matchesAptitude } from '@src/features/effects';
import { addFeature } from '@src/features/feature-helpers';
import { Pool } from '@src/features/pool';
import { Size } from '@src/features/size';
import { createTag, SpecialTest } from '@src/features/tags';
import { createTemporaryFeature } from '@src/features/temporary';
import { CommonInterval } from '@src/features/time';
import { localize } from '@src/foundry/localization';
import { arrayOf } from '@src/utility/helpers';
import type { WithUpdate } from '@src/utility/updating';
import { clamp, compact, last, merge } from 'remeda';
import {
  createSuccessTestModifier,
  grantedSuperiorResultEffects,
  rollSuccessTest,
  SimpleSuccessTestModifier,
  successTestEffectMap,
} from './success-test';
import { SuccessTestBase } from './success-test-base';

export type AptitudeCheckInit = {
  ego: Ego;
  character?: Character;
  token?: MaybeToken;
  aptitude: AptitudeType;
  action?: Action;
  special?: SpecialTestData & { messageRef?: string };
  modifiers?: SimpleSuccessTestModifier[];
};

export class AptitudeCheck extends SuccessTestBase {
  readonly ego;
  readonly character;
  readonly token;
  readonly aptitude: WithUpdate<{
    type: AptitudeType;
    multiplier: number;
  }>;
  readonly special;

  get basePoints() {
    return Math.round(
      this.ego.aptitudes[this.aptitude.type] * this.aptitude.multiplier,
    );
  }

  constructor({
    ego,
    character,
    token,
    aptitude,
    action,
    special,
    modifiers,
  }: AptitudeCheckInit) {
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

    this.special = special;

    this.pools.available = this.getPools(this.aptitude.type);
    this.modifiers.effects = this.getModifierEffects(
      this.aptitude.type,
      this.action,
    );

    for (const modifier of modifiers || []) {
      this.modifiers.simple.set(modifier.id, modifier);
    }

    if (this.special?.type === SpecialTest.Shock) {
      const energyArmor = this.character?.armor.getClamped(ArmorType.Energy);
      const armorModifier =
        energyArmor &&
        createSuccessTestModifier({
          name: localize('energyArmor'),
          value: energyArmor,
        });
      armorModifier &&
        this.modifiers.simple.set(armorModifier.id, armorModifier);
    } else if (this.special?.type === SpecialTest.Entangling) {
      const resultModifier = grantedSuperiorResultEffects(
        this.special.originalResult,
      );
      const modifier =
        resultModifier &&
        createSuccessTestModifier({
          name: `${this.special.source} ${localize(
            this.special.originalResult!,
          )}`,
          value: resultModifier * -10,
        });
      modifier && this.modifiers.simple.set(modifier.id, modifier);
    } else if (this.special?.type === SpecialTest.Stun) {
      const kineticArmor = this.character?.armor.getClamped(ArmorType.Kinetic);
      const armorModifier =
        kineticArmor &&
        createSuccessTestModifier({
          name: localize('kineticArmor'),
          value: kineticArmor,
        });
      armorModifier &&
        this.modifiers.simple.set(armorModifier.id, armorModifier);

      const morphSize = this.character?.morphSize;
      let morphSizeModifier: SimpleSuccessTestModifier | null = null;
      if (morphSize === Size.Large || morphSize === Size.VeryLarge) {
        morphSizeModifier = createSuccessTestModifier({
          name: `${localize('large')} ${localize('target')}`,
          value: 30,
        });
      } else if (morphSize === Size.Small || morphSize === Size.VerySmall) {
        morphSizeModifier = createSuccessTestModifier({
          name: `${localize('small')} ${localize('target')}`,
          value: -30,
        });
      }
      if (morphSizeModifier) {
        this.modifiers.simple.set(morphSizeModifier.id, morphSizeModifier);
      }
    } else if (this.special?.type === SpecialTest.PainResistance) {
      const { painResistance } = this;
      const modifier =
        painResistance && clamp(-20 + painResistance * 10, { min: 0 });
      if (modifier) {
        const painModifier = createSuccessTestModifier({
          name: localize('pain'),
          value: modifier,
        });
        this.modifiers.simple.set(painModifier.id, painModifier);
      }
      if (painResistance) {
        const resistBonus = createSuccessTestModifier({
          name: localize('painResistance'),
          value: 30,
        });
        this.modifiers.simple.set(resistBonus.id, resistBonus);
      }
    }
  }

  private get painResistance() {
    const sleeve = this.character?.sleeve;
    return (
      sleeve &&
      'physicalHealth' in sleeve &&
      sleeve.physicalHealth.wound?.woundsIgnored.value
    );
  }

  private getPools(aptitude: AptitudeType) {
    const poolMap = this.character?.pools;
    if (this.special?.type === SpecialTest.Integration) {
      const pool = poolMap?.get(
        this.ego.useThreat ? PoolType.Threat : PoolType.Flex,
      );
      return compact([
        pool &&
          new Pool({
            type: pool.type,
            initialValue: this.ego.useThreat
              ? this.ego.epData.threat
              : this.ego.epData.flex,
            spent: pool.spent,
          }),
      ]);
    }
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
    return successTestEffectMap(
      this.character?.appliedEffects.getMatchingSuccessTestEffects(
        matchesAptitude(aptitude, this.special?.type)(action),
        false,
      ) || [],
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
            this.special &&
              `${localize('versus')} ${localize(this.special.type)}`,
            [
              `${action.type} ${
                action.timeMod && action.type !== ActionType.Task
                  ? `(${localize('as')} ${localize('task')})`
                  : ''
              }`,
              localize(action.subtype),
              localize('action'),
            ].join(' '),
          ]),
        },
        successTest: data,
        specialTest: this.special,
      },
      entity: this.token ?? this.character, // TODO account for item sources,
      visibility: settings.visibility,
    });

    this.character?.updater.batchCommits(() => {
      if (pools.active) {
        this.character?.spendPool({
          pool: pools.active[0].type,
          points: 1,
        });
      }
      if (this.special?.type === SpecialTest.PainResistance) {
        const { painResistance } = this;
        const pain = createTemporaryFeature.effects({
          name: localize('pain'),
          effects: [],
          duration: CommonInterval.Turn * 2,
        });
        pain.effects = addFeature(
          pain.effects,
          createEffect.successTest({
            tags: [createTag.allActions({})],
            modifier: painResistance ? -10 : -20,
          }),
        );
        this.character?.updater
          .path('data', 'temporary')
          .commit(addFeature(pain));
      }
    });
  }
}
