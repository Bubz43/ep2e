import type { ActorEP } from '@src/entities/actor/actor';
import { ActorType } from '@src/entities/entity-types';
import { updateManyActors } from '@src/foundry/misc-helpers';
import { emitEPSocket } from '@src/foundry/socket';
import { nonNegative } from '@src/utility/helpers';
import { clamp } from 'remeda';
import { localize, LangEntry, format } from '../foundry/localization';
import { createFeature } from './feature-helpers';
import { parseMilliseconds, toMilliseconds } from './modify-milliseconds';

type Options = Partial<{
  turns: boolean;
  compact: boolean;
  approx: boolean;
  whenZero: string;
  whenNegative: string;
}>;

export type Timestamp = {
  realTimeMS: number;
  worldTimeMS: number;
};

export const createTimestamp = createFeature<Timestamp>(() => ({
  realTimeMS: Date.now(),
  worldTimeMS: currentWorldTimeMS(),
}));

// TODO Time since timestamp

// This should always be ordered from biggest to smallest
export const timeIntervals = ['days', 'hours', 'minutes', 'seconds'] as const;

export type TimeInterval = typeof timeIntervals[number];

export const prettyMilliseconds = (
  milliseconds: number,
  {
    turns = true,
    compact = true,
    approx = false,
    whenZero = '0',
    whenNegative = localize('indefinite'),
  }: Options = {},
) => {
  if (milliseconds < 0) return whenNegative;
  if (milliseconds === 0) return whenZero;
  const parsed = parseMilliseconds(milliseconds);
  const final: string[] = [];
  let approxApplied = false;
  for (const interval of timeIntervals) {
    const showTurns = interval === 'seconds' && turns;
    let toLocalize = showTurns ? 'turns' : interval;
    const value = parsed[interval] / (showTurns ? 3 : 1);
    if (
      approx &&
      value &&
      (interval === 'minutes' || interval === 'seconds') &&
      final.length
    ) {
      approxApplied = true;
      continue;
    }
    if (value === 1) toLocalize = toLocalize.substr(0, toLocalize.length - 1);
    const label = localize(toLocalize as LangEntry).toLocaleLowerCase();
    if (value)
      final.push(
        [
          value % 1 ? value.toFixed(2) : value,
          compact ? label[0] : ` ${label}`,
        ].join(''),
      );
  }
  return `${approxApplied ? '~' : ''}${final.join(
    compact ? ' ' : ', ',
  )}`.trim();
};

export const prettyDate = (value: string) => {
  const date = new Date(value);
  return new Date(
    date.getTime() - date.getTimezoneOffset() * -60000,
  ).toLocaleDateString();
};

export enum EPTimeInterval {
  ActionTurns = 'actionTurns',
  Minutes = 'minutes',
  Hours = 'hours',
  Days = 'days',
}

export enum CommonInterval {
  Turn = toMilliseconds({ seconds: 3 }),
  Minute = toMilliseconds({ minutes: 1 }),
  Hour = toMilliseconds({ hours: 1 }),
  Day = CommonInterval.Hour * 24,
  Week = CommonInterval.Day * 7,
  Instant = 0,
  Indefinite = -1,
}

export const prettyOnset = (onset: number) => {
  if (onset <= 0) return localize('ready');
  const label =
    onset <= CommonInterval.Turn
      ? `${localize('at')} ${localize('endOfTurn')}`
      : onset <= CommonInterval.Turn * 2
      ? `${localize('at')} ${localize('endOfNextTurn')}`
      : `${localize('in')} ${prettyMilliseconds(onset, { compact: false })}`;
  return `${localize('active')} ${label}`.toLocaleLowerCase();
};

export type LiveTimeState = {
  img?: string;
  label: string;
  duration: number;
  id: string;
  startTime: number;
  updateStartTime: (newStartTime: number) => void;
  readonly elapsed: number;
  readonly remaining: number;
  readonly progress: number;
  readonly completed: boolean;
  readonly isIndefinite: boolean;
};

export const createLiveTimeState = (
  staticParts: Pick<
    LiveTimeState,
    'label' | 'duration' | 'id' | 'startTime' | 'updateStartTime' | 'img'
  >,
): Readonly<LiveTimeState> => ({
  ...staticParts,
  get elapsed() {
    return getElapsedTime(this.startTime);
  },
  get remaining() {
    return nonNegative(this.duration - this.elapsed);
  },
  get isIndefinite() {
    return this.duration < 0;
  },
  get completed() {
    return !this.isIndefinite && this.remaining === 0;
  },

  get progress() {
    return clamp((this.elapsed / this.duration) * 100, { min: 0, max: 100 });
  },
});

export const refreshAvailable = ({ completed }: LiveTimeState) => completed;

export const currentWorldTimeMS = () => {
  return toMilliseconds({ seconds: game.time.worldTime });
};

export const advanceWorldTime = async (milliseconds: number) => {
  let change = milliseconds;
  const current = currentWorldTimeMS();
  if (change < 0 && Math.abs(change) > current) {
    change = -current;
  }
  game.time.advance(Math.round(change / 1000));
  emitEPSocket(
    {
      worldTimeChange: [
        Date.now(),
        format('ModifiedTime', {
          direction: localize(
            change >= 0 ? 'advanced' : 'rewound',
          ).toLocaleLowerCase(),
          amount: prettyMilliseconds(Math.abs(change), {
            compact: false,
          }),
        }),
      ],
    },
    true,
  );
};

export const getElapsedTime = (worldTimestampMS: number) => {
  return currentWorldTimeMS() - worldTimestampMS;
};

// export const onWorldTimeUpdate = (_: number, delta: number) => {
//   const deltaMS = toMilliseconds({ seconds: delta });
//   console.log(deltaMS);
// }
