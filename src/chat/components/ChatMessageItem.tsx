import type { ChatMessageEP } from '@src/entities/chat-message';
import {
  Component,
  createEffect,
  createMemo,
  createSignal,
  onCleanup,
  onMount,
} from 'solid-js';
import { Show } from 'solid-js/web';
import { containedCSS as css } from '@src/theme/emotion';
import { colorFunctions, cssVar } from '@src/theme/css-vars';
import {
  ActorIdentifiers,
  findActor,
  findToken,
} from '@src/entities/find-entities';
import { mapKeys } from 'remeda';

const message = css`
  display: block;
  background: ${colorFunctions.alphav('--color-bg', 0.9)};
  width: calc(100% - 1rem);
  border: 2px solid ${cssVar('--color-border')};
  padding: 0;
  border-radius: 0.5rem 0px 0px 0.25rem;
  box-shadow: 0 0 4px ${cssVar('--color-bg')};
`;

const header = css`
  display: grid;
  grid-template-areas:
    'img sender meta'
    'img whisper whisper'
    'img flavor flavor';
  grid-template-rows: repeat(3, min-content);
  grid-template-columns: 0.5rem 1fr auto;
  padding: 0.2rem 0.3rem;
  border-bottom: 1px solid ${cssVar('--color-border')};
  column-gap: 0.5rem;
  align-items: center;
  position: relative;
  z-index: 1;
  background: ${colorFunctions.alphav('--color-grey', 0.15)};
  border-top-left-radius: 0.5rem;
`;

const imageWrapper = css`
  header & {
    grid-area: img;
    align-self: start;
    filter: drop-shadow(2px 3px 3px black);
    pointer-events: none;

    img {
      all: unset;
      width: 2rem;
      position: absolute;
      transform: translate(-70%, -0.1rem);
      z-index: 10;
    }
  }
`;

export const ChatMessageItem: Component<{
  data: ChatMessageEP['data'];
  setSeen: () => void;
}> = (props) => {
  const [sinceCreated, setSinceCreated] = createSignal(
    timeSince(props.data.timestamp),
  );
  const user = game.users.get(props.data.user);
  const timeout = setTimeout(
    () => setSinceCreated(timeSince(props.data.timestamp)),
    15000,
  );
  const img = createMemo(() => {
    const speakerToId = mapKeys(
      props.data.speaker,
      (k) => k + 'Id',
    ) as ActorIdentifiers;
    return speakerToId.tokenId
      ? findToken(speakerToId)?.data.img
      : speakerToId.actorId
      ? findActor(speakerToId)?.img
      : user?.avatar;
  });

  let listItem: HTMLLIElement | undefined = undefined;
  let intObs: IntersectionObserver | null = null;

  onMount(() => {
    requestAnimationFrame(() => {
      if (!listItem?.parentElement) return;
      intObs = new IntersectionObserver(
        ([entry], intObs) => {
          if (entry?.intersectionRatio) {
            props.setSeen();
            intObs.disconnect();
          }
        },
        { root: listItem.parentElement },
      )
      intObs.observe(listItem)
    });
  });

  onCleanup(() => {
    clearTimeout(timeout);
    intObs?.disconnect();
  });
  return (
    <li class={message} ref={listItem}>
      <header class={header}>
        <div class={imageWrapper}>
          <img src={img() || CONST.DEFAULT_TOKEN} loading="lazy" width="32px" />
        </div>
        {user?.name || 'User'} {sinceCreated()}
      </header>
      {props.data.flags.ep2e && (
        <message-content
          message={game.messages.get(props.data._id)!}
          data={props.data.flags.ep2e}
        ></message-content>
      )}
    </li>
  );
};
