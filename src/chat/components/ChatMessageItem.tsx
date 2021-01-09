import type { ChatMessageEP } from '@src/entities/chat-message';
import {
  Component,
  createEffect,
  createMemo,
  createResource,
  createSignal,
  Match,
  onCleanup,
  onMount,
  Switch,
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
import type { RollData } from '@src/foundry/rolls';
import { tooltip } from '@src/init';
import { data } from 'jquery';
import { html } from 'lit-html';
import { unsafeHTML } from 'lit-html/directives/unsafe-html';

const message = css`
  sl-window & {
    width: 300px;
    border: none;
    border-radius: 0;
    box-shadow: 0 0 0px black;
  }
  display: block;
  background: ${colorFunctions.alphav('--color-bg', 0.9)};
  width: 100%;
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

  sl-window & {
    grid-template-columns: auto 1fr auto;
    padding-bottom: 0;
    border-top-left-radius: 0;
    background: transparent;
  }
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
  sl-window & {
    img {
      position: static;
      transform: none;
    }
  }
`;

const enrichedContent = css`
  font-size: 1rem;
  padding: 0.25rem 0.5rem;
  margin: 0;
`;

const messageContent = css`
  background: linear-gradient(
    to bottom,
    ${colorFunctions.alphav('--color-background-alt', 0.8)},
    ${colorFunctions.alphav('--color-bg', 0.8)}
  );
`;

export const ChatMessageItem: Component<{
  data: ChatMessageEP['data'];
  setSeen?: () => void;
  openPopout?: (id: string) => void;
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

  const rollData = createMemo(() => {
    let data: RollData | null = null;
    if (props.data.roll) {
      try {
        data = JSON.parse(props.data.roll);
      } catch {
        console.log(data);
      }
    }
    return data;
  });

  let listItem: HTMLLIElement | undefined = undefined;
  let intObs: IntersectionObserver | null = null;

  onMount(() => {
    requestAnimationFrame(() => {
      if (!listItem?.parentElement) return;
      intObs = new IntersectionObserver(
        ([entry], obs) => {
          if (entry?.intersectionRatio) {
            props.setSeen?.();
            obs.disconnect();
            intObs = null;
          }
        },
        { root: listItem.parentElement },
      );
      intObs.observe(listItem);
    });
  });

  onCleanup(() => {
    if (intObs) props.setSeen?.();
    clearTimeout(timeout);
    intObs?.disconnect();
  });
  return (
    <li
      class={message}
      ref={listItem}
      onContextMenu={() => props.openPopout?.(props.data._id)}
    >
      <header class={header}>
        <div class={imageWrapper}>
          <img src={img() || CONST.DEFAULT_TOKEN} loading="lazy" width="32px" />
        </div>
        {user?.name || 'User'} {sinceCreated()}
      </header>
      <div class={messageContent}>
        {props.data.flags.ep2e && (
          <message-content
            message={game.messages.get(props.data._id)!}
            data={props.data.flags.ep2e}
          ></message-content>
        )}

        <Switch>
          <Match when={rollData()}>
            {(data) => <MessageRoll rollData={data} />}
          </Match>
          <Match when={props.data.content && props.data.content !== '_'}>
            <enriched-html
              class={enrichedContent}
              content={props.data.content}
            ></enriched-html>
          </Match>
        </Switch>
      </div>
    </li>
  );
};

const rollEl = css`
  text-align: center;
  padding: 0.25rem;
  > div {
    height: 0.4rem;
    width: 100%;
    border: 1px solid ${cssVar('--color-border')};
    border-left: none;
    border-right: none;
  }
`;

const MessageRoll: Component<{ rollData: RollData }> = (props) => {
  return (
    <div
      class={rollEl}
      onMouseEnter={async (ev) => {
        tooltip.attach({
          el: ev.currentTarget,
          content: html`${unsafeHTML(
            (await Roll.fromData(props.rollData).getTooltip()) as string,
          )}`,
          position: 'left-start',
        });
      }}
    >
      {props.rollData.formula}
      <div></div>
      {props.rollData.total}
    </div>
  );
};
