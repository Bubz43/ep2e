import { CommonInterval, currentWorldTimeMS } from './time';

export interface StandardCalendar {
  /**
   * days
   */
  yearLength: number;
  /**
   * milliseconds
   */
  dayLength: number;
  worldStartYear: number;
  worldStartTime: number;
}

// TODO: Leap years, custom months

const months = [
  ['January', 31],
  ['February', 28],
  ['March', 31],
  ['April', 30],
  ['May', 31],
  ['June', 30],
  ['July', 31],
  ['August', 31],
  ['September', 30],
  ['October', 31],
  ['November', 30],
  ['December', 31],
] as const;

type Month = typeof months[number][0];

const monthThresholds = months.reduce((accum, [month, days], index) => {
  const previous = months[index - 1]?.[0];
  const previousAccum = (previous && accum.get(previous)) || 0;
  accum.set(month, previousAccum + days);
  return accum;
}, new Map<Month, number>(months));

export const defaultStandardCalendar = (): StandardCalendar => ({
  yearLength: 365,
  dayLength: CommonInterval.Day,
  worldStartYear: 10,
  worldStartTime: 0,
});

const getMonth = (dayInYear: number): { month: Month; day: number } => {
  for (const [month, days] of months) {
    const threshold = monthThresholds.get(month) ?? days;
    if (dayInYear <= threshold) {
      return {
        month,
        day: dayInYear - (threshold - days),
      };
    }
  }
  return {
    month: 'January',
    day: dayInYear,
  };
};

export const getCurrentDateTime = (calendar: StandardCalendar) => {
  const worldTime = calendar.worldStartTime + currentWorldTimeMS();
  const days = Math.floor(worldTime / calendar.dayLength);
  const time = worldTime % calendar.dayLength;
  const yearGain = Math.floor(days / calendar.yearLength);
  const dayInYear = (days % calendar.yearLength) + 1;
  const currentYear = calendar.worldStartYear + yearGain;
  return {
    era: currentYear < 0 ? 'BF' : 'AF',
    year: Math.abs(currentYear),
    ...getMonth(dayInYear),
    time,
  };
};
