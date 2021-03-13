import { toMilliseconds } from './modify-milliseconds';
import { currentWorldTimeMS } from './time';

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

export const defaultStandardCalendar = (): StandardCalendar => ({
  yearLength: 365,
  dayLength: toMilliseconds({ hours: 24 }),
  worldStartYear: 10,
  worldStartTime: 0,
});

export const getCurrentDate = (calendar: StandardCalendar) => {
  const worldTime = calendar.worldStartTime + currentWorldTimeMS();
  const days = Math.floor(worldTime / calendar.dayLength);
  const time = worldTime % calendar.dayLength;
  const yearGain = Math.floor(days / calendar.yearLength);
  const day = (days % calendar.yearLength) + 1;
  const currentYear = calendar.worldStartYear + yearGain;
  return {
    era: currentYear < 0 ? 'BF' : 'AF',
    year: Math.abs(currentYear),
    day,
    time,
  };
};
