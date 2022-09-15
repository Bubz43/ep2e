import { readyCanvas } from '@src/foundry/canvas';
import { NotificationType, notify } from '@src/foundry/foundry-apps';
import type { TokenData } from '@src/foundry/foundry-cont';
import { localize } from '@src/foundry/localization';
import { openMenu } from '@src/open-menu';
import { html } from 'lit-html';
import { uniq } from 'remeda';
import type { ActorEP } from './actor/actor';
import type { Character } from './actor/proxies/character';
import { ActorType } from './entity-types';
import type { SceneEP } from './scene';

export type ActorIdentifiers = {
  actorId?: string | null;
  tokenId?: string | null;
  sceneId?: string | null;
  uuid?: string | null;
};

export const createTempToken = (tokenData: TokenData, scene: SceneEP) => {
  return new TokenDocument(tokenData, { parent: scene });
};

export const findActor = (ids: ActorIdentifiers) => {
  if (ids.tokenId && ids.sceneId) {
    if (!ids.actorId && ids.sceneId === readyCanvas()?.scene.id) {
      return game.actors.tokens[ids.tokenId];
    }
    const token = findToken(ids);
    return token?.actor as ActorEP | null;
  }
  return ids.actorId ? game.actors.get(ids.actorId) : null;
};

export const findToken = ({ actorId, tokenId, sceneId }: ActorIdentifiers) => {
  const token = readyCanvas()?.tokens.placeables.find(
    ({ id, scene, document: data }) =>
      id === tokenId &&
      scene?.id === sceneId &&
      (actorId ? data.actorId === actorId : true),
  );
  if (token) return token.document;
  const scene = sceneId && game.scenes.get(sceneId);
  if (scene && tokenId) {
    const tokenData = scene.tokens.get(tokenId)?.toJSON() as
      | TokenData
      | undefined;
    if (tokenData) return createTempToken(tokenData, scene);
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

export const pickOrDefaultCharacter = (
  callback: (character: Character) => void,
) => {
  pickOrDefaultActor((actor) => {
    if (actor.proxy.type !== ActorType.Character)
      throw new Error('Wrong actor type');
    callback(actor.proxy);
  }, true);
};

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
    );
};
