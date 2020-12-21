import { createEffect, extractDurationEffectMultipliers } from './effects';
import { expect } from '@esm-bundle/chai';
import { first, pipe } from 'remeda';

const cummulativeEffect = createEffect.duration({
  cummulative: true,
  modifier: -50,
});

describe(extractDurationEffectMultipliers.name, () => {
  it('adds cummulative modifiers', () => {
    pipe(
      [cummulativeEffect, cummulativeEffect],
      extractDurationEffectMultipliers,
      first,
      expect,
    ).to.equal(0);
  });
});
