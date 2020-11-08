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
