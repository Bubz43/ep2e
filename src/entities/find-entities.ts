import { NotificationType, notify } from '@src/foundry/foundry-apps';
import type { TokenData } from '@src/foundry/foundry-cont';
import { localize } from '@src/foundry/localization';
import { readyCanvas } from '@src/foundry/canvas';
import { openMenu } from '@src/open-menu';
import { html } from 'lit-html';
import { uniq } from 'remeda';
import type { ActorEP } from './actor/actor';
import { ActorType } from './entity-types';
import type { SceneEP } from './scene';
import type { Character } from './actor/proxies/character';

export type ActorIdentifiers = {
  actorId?: string | null;
  tokenId?: string | null;
  sceneId?: string | null;
  uuid?: string | null;
};

const tempTokens = new WeakMap<TokenData, Token>();

const getTempToken = (tokenData: TokenData, scene: SceneEP) => {
  let token = tempTokens.get(tokenData);
  if (!token) {
    token = new Token(tokenData, scene);
    tempTokens.set(tokenData, token);
  }
  return token;
};

export const findActor = (ids: ActorIdentifiers) => {
  if (ids.tokenId && ids.sceneId) {
    if (!ids.actorId && ids.sceneId === readyCanvas()?.scene.id) {
      return game.actors.tokens[ids.tokenId];
    }
    const token = findToken(ids);
    return token && (token.actor || Actor.fromToken(token));
  }
  return ids.actorId ? game.actors.get(ids.actorId) : null;
};

export const findToken = ({ actorId, tokenId, sceneId }: ActorIdentifiers) => {
  const token = readyCanvas()?.tokens.placeables.find(
    ({ id, scene, data }) =>
      id === tokenId &&
      scene?.id === sceneId &&
      (actorId ? data.actorId === actorId : true),
  );
  if (token) return token;
  const scene = sceneId && game.scenes.get(sceneId);
  if (scene) {
    const tokenData = scene.data.tokens.find((t) => t._id === tokenId);
    if (tokenData) return getTempToken(tokenData, scene);
  }
  return;
};

export const getControlledTokenActors = (onlyCharacters = false) => {
  return uniq(
    readyCanvas()?.tokens.controlled.flatMap(({ actor }) =>
      onlyCharacters
        ? actor?.type === ActorType.Character
          ? actor
          : []
        : actor || [],
    ) || [],
  );
};

export const pickOrDefaultCharacter = (callback: (character: Character) => void) => {
  pickOrDefaultActor((actor => {
    if (actor.proxy.type !== ActorType.Character) throw new Error("Wrong actor type")
    callback(actor.proxy)
  }), true)
}

export const pickOrDefaultActor = (
  callback: (actor: ActorEP) => void,
  onlyCharacters = false,
) => {
  const controlledActors = getControlledTokenActors(onlyCharacters);
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
  } else if (controlledActors[0]) callback(controlledActors[0]);
  else if (game.user.character) callback(game.user.character);
  else
    notify(
      NotificationType.Info,
      `${localize('no')} ${localize('controlled')} ${localize(
        onlyCharacters ? 'characters' : 'actors',
      )}`,
    ); // TODO localize
};

// export const getMainCharacter = (notifyIfNone: boolean) => {
//   const main = overlay.mainCharacter;
//   if (!main && notifyIfNone) {
//     notify(NotificationType.Error, "No character selected.");
//   }
//   return main;
// };
