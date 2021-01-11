import { mapToObj } from 'remeda';

const cssColors = [
  '--color-primary',
  '--color-primary-alt',
  '--color-secondary',
  '--color-bg',
  '--color-background-alt',
  '--color-border',
  '--color-disabled',
  '--color-text',
  '--color-text-lighter',
  '--color-text-disabled',
  '--color-grey',
] as const;

const post = ['-h', '-s', '-l'] as const;

const spreadOut = mapToObj(cssColors, (color) => {
  const [h, s, l] = post.map((p) => `var(${color + p})`);
  return [color, { h, s, l }];
});

export const cssFonts = {
  font1: 'font-family: var(--font-1);',
  font2: 'font-family: var(--font-2);',
  font3: 'font-family: var(--font-3);',
  fontMono: 'font-family: var(--font-mono);',
} as const;

export const cssVar = (name: typeof cssColors[number]) => {
  return `var(${name})`;
};

// const hslVals = (name: string) => {
//   const [h, s, l] = post.map(p => `var(${name + p})`)
//   return { h, s, l };
// }

// Multipliers could also be string if they are vars

export const colorFunctions = {
  alphav: (prop: keyof typeof spreadOut, alpha: number) => {
    const { h, s, l } = spreadOut[prop];
    return `hsla(${h}, ${s}, ${l}, ${alpha})`;
  },
  lightv: (prop: keyof typeof spreadOut, lightnessMultiplier: number) => {
    const { h, s, l } = spreadOut[prop];
    return `hsl(${h}, ${s}, calc(${l} * ${lightnessMultiplier}))`;
  },
  satv: (prop: keyof typeof spreadOut, saturationMultiplier: number) => {
    const { h, s, l } = spreadOut[prop];
    return `hsl(${h}, calc(${s} * ${saturationMultiplier}), ${l})`;
  },
};
