import { localize, LangEntry } from '../foundry/localization';

export const toMilliseconds = ({
  days = 0,
  hours = 0,
  minutes = 0,
  seconds = 0,
} = {}) => {
  let time = 0;
  time += days * 60 * 60 * 24 * 1000;
  time += hours * 60 * 60 * 1000;
  time += minutes * 60 * 1000;
  time += seconds * 1000;
  return time;
};

export const parseMilliseconds = (milliseconds: number) => {
  if (!Number.isFinite(milliseconds)) {
    throw new Error(`Milliseconds must be finite`);
  }
  const rounded = 1000 * Math.round(milliseconds / 1000);
  const time = new Date(rounded);
  const totalHours = Math.floor(rounded / 3600000);
  return {
    days: Math.floor(totalHours / 24),
    hours: totalHours % 24,
    minutes: time.getUTCMinutes(),
    seconds: time.getUTCSeconds(),
  };
};

type Options = Partial<{
  turns: boolean;
  compact: boolean;
  approx: boolean;
  whenZero: string;
  whenNegative: string;
}>;

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

export const prettyDuration = (duration: number, options?: Options) => {
  if (duration === 0) return localize('completed');
  if (duration < 0) return localize('indefinite');
  return prettyMilliseconds(duration, options);
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
