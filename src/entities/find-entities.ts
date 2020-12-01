import { NotificationType, notify } from '@src/foundry/foundry-apps';
import { localize } from '@src/foundry/localization';
import { activeCanvas } from '@src/foundry/misc-helpers';
import { openMenu } from '@src/open-menu';
import { html } from 'lit-html';
import { uniq } from 'remeda';
import type { ActorEP } from './actor/actor';

export type ActorIdentifiers = {
  actorId?: string | null;
  tokenId?: string | null;
  sceneId?: string | null;
  uuid?: string | null;
};

export const findActor = (ids: ActorIdentifiers) => {
  if (ids.tokenId && ids.sceneId) {
    if (!ids.actorId && ids.sceneId === activeCanvas()?.scene.id) {
      return game.actors.tokens[ids.tokenId];
    }
    const token = findToken(ids);
    return token && (token.actor || Actor.fromToken(token));
  }
  return ids.actorId ? game.actors.get(ids.actorId) : null;
};

export const findToken = ({ actorId, tokenId, sceneId }: ActorIdentifiers) => {
  const token = activeCanvas()?.tokens.placeables.find(
    ({ id, scene, data }) =>
      id === tokenId &&
      scene?.id === sceneId &&
      (actorId ? data.actorId === actorId : true),
  );
  if (token) return token;
  const scene = sceneId && game.scenes.get(sceneId);
  if (scene) {
    const tokenData = scene.data.tokens.find((t) => t._id === tokenId);
    if (tokenData) return new Token(tokenData, scene);
  }
  return;
};

export const getControlledTokenActors = () => {
  return uniq(
    activeCanvas()?.tokens.controlled.flatMap(({ actor }) => actor || []) || [],
  );
};

export const pickOrDefaultActor = (callback: (actor: ActorEP) => void) => {
  const controlledActors = getControlledTokenActors();
  if (controlledActors.length > 1) {
    openMenu({
      content: controlledActors.map((actor) => {
        const { name, img } = actor.tokenOrLocalInfo;
        return {
          label: name,
          icon: html`<img src=${img} />`,
          callback: () => callback(actor),
        };
      }),
    });
    // TODO open menu
  } else if (controlledActors[0]) callback(controlledActors[0]);
  else if (game.user.character) callback(game.user.character);
  else notify(NotificationType.Info, 'No controlled actors'); // TODO localize
};

// export const getMainCharacter = (notifyIfNone: boolean) => {
//   const main = overlay.mainCharacter;
//   if (!main && notifyIfNone) {
//     notify(NotificationType.Error, "No character selected.");
//   }
//   return main;
// };
