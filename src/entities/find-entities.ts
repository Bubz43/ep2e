import { activeCanvas } from '@src/foundry/misc-helpers';

export type ActorIdentifiers = {
  actorId?: string | null;
  tokenId?: string | null;
  sceneId?: string | null;
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

// export const getMainCharacter = (notifyIfNone: boolean) => {
//   const main = overlay.mainCharacter;
//   if (!main && notifyIfNone) {
//     notify(NotificationType.Error, "No character selected.");
//   }
//   return main;
// };
