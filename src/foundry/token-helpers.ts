import { conditionIcons } from '@src/features/conditions';
import { concat, first, pipe, uniq } from 'remeda';
import type { ActorEP, MaybeToken } from '../entities/actor/actor';
import { readyCanvas } from './canvas';

export const panToToken = (token: Token) => {
  if (token?.isVisible && token.scene?.isView) {
    token.control();
    readyCanvas()?.animatePan({
      x: token.x,
      y: token.y,
      scale: undefined,
      speed: undefined,
    });
  }
};

export const releaseTargetToken = (token: Token) =>
  token.setTarget(false, { releaseOthers: false });

export const releaseAllTargets = () =>
  first([...game.user.targets])?.setTarget(false, { releaseOthers: true });

export const activateTargetingTool = () => {
  if (ui.controls.activeControl !== 'token') {
    document
      .querySelector<HTMLElement>("#controls [data-control='token']")
      ?.click();
  }
  requestAnimationFrame(() => {
    ui.controls.control.activeTool = 'target';
    ui.controls.render();
  });
};

export const activeTokenStatusEffects = ({ data, actor }: Token) =>
  pipe(
    data.effects ?? [],
    concat(
      ((actor as ActorEP | undefined)?.conditions ?? []).map(
        (condition) => conditionIcons[condition],
      ),
    ),
    uniq(),
  );

export const distanceBetweenTokens = (tokenA: Token, tokenB: Token) =>
  Math.round(
    Math.hypot(
      readyCanvas()!.grid.measureDistance(tokenA.center, tokenB.center),
      Math.abs(tokenA.data.elevation - tokenB.data.elevation),
    ) * 10,
  ) / 10;

export const getTokenPlaceable = (
  tokenDoc: MaybeToken,
  actor?: ActorEP | null,
) => {
  return (
    tokenDoc?.object ??
    (actor?.getActiveTokens(true, false)[0] as undefined | Token)
  );
};
