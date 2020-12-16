import { createMessage } from '@src/chat/create-message';
import { AptitudeType, enumValues, PoolType } from '@src/data-enums';
import type { Character } from '@src/entities/actor/proxies/character';
import { localize } from '@src/foundry/localization';
import { HealthStat, HealthType } from '@src/health/health';
import type { MenuOption } from '@src/open-menu';
import { notEmpty, withSign } from '@src/utility/helpers';
import { localImage } from '@src/utility/images';
import { html } from 'lit-html';
import { compact } from 'remeda';
import { createEffect, Effect } from './effects';
import { addFeature, stringID } from './feature-helpers';
import type { ReadonlyPool } from './pool';
import { Favor } from './reputations';
import { createTag } from './tags';
import { createTemporaryFeature, TemporaryFeatureEnd } from './temporary';
import { CommonInterval } from './time';

export const poolIcon = (type: PoolType) =>
  localImage(`icons/pools/${type}.png`);

const linkedAptitudePoints = [1, 2] as const;

const linkedAptitudes: Record<PoolType, ReadonlyArray<AptitudeType>> = {
  [PoolType.Flex]: [],
  [PoolType.Insight]: [AptitudeType.Cognition, AptitudeType.Intuition],
  [PoolType.Moxie]: [AptitudeType.Savvy, AptitudeType.Willpower],
  [PoolType.Vigor]: [AptitudeType.Reflexes, AptitudeType.Savvy],
  [PoolType.Threat]: enumValues(AptitudeType),
};

const narrativeControl = [
  'introduceNPC',
  'introduceItem',
  'defineEnvironment',
  'defineRelationship',
] as const;

type PoolOptionGetter = ({
  character,
  pool,
}: {
  character: Character;
  pool: ReadonlyPool;
}) => MenuOption[];

export const poolUseMessage = ({
  label,
  pool,
  character,
}: {
  label: string;
  pool: ReadonlyPool;
  character: Character;
}) => {
  return createMessage({
    data: {
      header: {
        heading: localize(pool.type),
        subheadings: label,
        img: pool?.icon,
      },
    },
    entity: character.actor,
  });
};

const tempEffect = (pool: PoolType, effect: Effect) =>
  createTemporaryFeature.effects({
    duration: CommonInterval.Day,
    name: `${localize('ongoing')} ${localize(pool)} ${localize('effect')}`,
    endOn: TemporaryFeatureEnd.Recharge,
    effects: [{ ...effect, id: stringID() }],
  });

const messageOnly = ({
  character,
  pool,
  label,
}: {
  character: Character;
  pool: ReadonlyPool;
  label: string;
}) => ({
  label,
  disabled: !pool.available,
  callback: async () => {
    await poolUseMessage({
      label,
      pool,
      character,
    });
    character.spendPool({ pool: pool.type, points: 1 });
  },
});

const ignore = ({
  character,
  pool,
  toIgnore,
}: {
  character: Character;
  pool: ReadonlyPool;
  toIgnore: 'trauma' | 'wound';
}): MenuOption => {
  return {
    label: `${localize(
      toIgnore === 'trauma' ? 'ignoreTrauma' : 'ignoreWound',
    )} [24 ${localize('hours')}]`,
    disabled: !pool.available,
    icon: html`<mwc-icon>healing</mwc-icon>`,
    callback: () => {
      character.updater.prop('data', 'temporary').store(
        addFeature(
          tempEffect(
            pool.type,
            createEffect.health({
              modifier: 1,
              stat: HealthStat.WoundsIgnored,
              health:
                toIgnore === 'trauma' ? HealthType.Mental : HealthType.Physical,
            }),
          ),
        ),
      );
      character.spendPool({ pool: pool.type, points: 1 });
    },
  };
};

const createLinkedAptitude = ({
  pool,
  aptitude,
  points,
}: {
  pool: PoolType;
  aptitude: AptitudeType;
  points: typeof linkedAptitudePoints[number];
}) =>
  tempEffect(
    pool,
    createEffect.successTest({
      modifier: 5 * points,
      tags: [createTag.linkedAptitude({ aptitude })],
    }),
  );

const insight: PoolOptionGetter = (init) => [
  messageOnly({ label: localize('acquireClue'), ...init }),
];

const moxie: PoolOptionGetter = ({ character, pool }) => {
  const repOptions: MenuOption[] = [...character.ego.reps].flatMap(
    ([network, rep]) => {
      return ([Favor.Minor, Favor.Moderate] as const).flatMap((type, index) => {
        const points = index + 1;
        const used = rep[type];
        return used
          ? {
              label: `[${rep.acronym.toLocaleUpperCase()}] ${localize(
                'refresh',
              )} ${localize(type)} ${localize('favor')} (${index + 1})`,
              disabled: points > pool.available,
              callback: () => {
                character.updater
                  .prop('data', 'reps', network, type)
                  .store(used - 1);
                character.spendPool({ pool: pool.type, points });
              },
            }
          : [];
      });
    },
  );

  return compact([
    ...repOptions,
    ...(['acquireClue', 'negateGaffe'] as const).map((message) =>
      messageOnly({ label: localize(message), pool, character }),
    ),
    ...(character.psi?.hasVariableInfection
      ? ([
          messageOnly({
            label: `${localize('avoid')} ${localize('infectionTest')}`,
            pool,
            character,
          }),
        ] as const)
      : []),
  ]);
};

const flex: PoolOptionGetter = ({ character, pool }) =>
  narrativeControl.map((control) =>
    messageOnly({ label: localize(control), character, pool }),
  );

export const poolActionOptions = (character: Character, poolType: PoolType) => {
  const pool = character.pools.get(poolType);
  const available = pool?.disabled ? 0 : pool?.available || 0;
  const options: MenuOption[] = linkedAptitudes[poolType].flatMap(
    (aptitudeType) =>
      linkedAptitudePoints.map((point) => ({
        label: `${withSign(5 * point)} ${localize('linkedAptitude')} ${localize(
          aptitudeType,
        )} ${localize('modifier')}`,
        disabled: point > available,
        callback: async () => {
          character.updater.prop('data', 'temporary').store(
            addFeature(
              createLinkedAptitude({
                pool: poolType,
                aptitude: aptitudeType,
                points: point,
              }),
            ),
          );
          character.spendPool({ pool: poolType, points: point });
        },
      })),
  );

  switch (pool?.type) {
    case PoolType.Insight:
      options.push(...[insight({ character, pool })].flat());
      break;

    case PoolType.Moxie:
      options.push(
        ignore({ character, pool, toIgnore: 'trauma' }),
        ...[moxie({ character, pool })].flat(),
      );
      break;

    case PoolType.Vigor:
      options.push(ignore({ character, pool, toIgnore: 'wound' }));
      break;

    case PoolType.Threat:
      options.push(
        ...(['trauma', 'wound'] as const).map((toIgnore) =>
          ignore({ character, pool, toIgnore }),
        ),
      );

      break;

    case PoolType.Flex:
      options.push(...[flex({ character, pool })].flat());
      break;

    default:
      break;
  }

  return options;
};
