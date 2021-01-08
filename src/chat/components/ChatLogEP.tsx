import { ChatMessageEP } from '@src/entities/chat-message';
import { mutateEntityHook, MutateEvent } from '@src/foundry/hook-setups';
import { containedCSS as css } from '@src/theme/emotion';
import { concat, map, pipe, take, reverse } from 'remeda';
import {
  Component,
  createState,
  onMount,
  reconcile,
  For,
  Show,
  produce,
  createEffect,
  createSignal,
} from 'solid-js';
import { ChatMessageItem } from './ChatMessageItem';

const container = css`
  display: grid;
  grid-template-rows: 1fr auto;
  gap: 0.25rem;
  width: 325px;
  height: 100vh;
`;

const messages = css`
  display: grid;
  gap: 0.25rem;
  overflow-y: auto;
  overflow-x: hidden;
  list-style: none;
  margin: 0;
  padding: 0;
  pointer-events: all;
  justify-items: center;
`;

const hiddenItem = css`
  border: 1px solid transparent;
`;

const unseenCount = css`
  position: fixed;
  width: 325px;
  height: 3ch;
  font-size: large;
  text-align: center;
  background: orange;
  bottom: 0;
  left: 0;
`;

export const ChatLogEP: Component = () => {
  const [state, setState] = createState({
    list: [...game.messages.values()]
      .slice(-CONFIG.ChatMessage.batchSize)
      .map((message) => duplicate(message.data)),
  });
  const [onBottom, setOnBottom] = createSignal(false);
  const [unseen, setUnseen] = createSignal(0);
  let list: HTMLElement | undefined = undefined;
  let scrollTarget: HTMLLIElement | undefined = undefined;

  const scrollBottom = () => {
    requestAnimationFrame(() => scrollTarget?.scrollIntoView());
    setUnseen(0);
  };

  onMount(() => {
    scrollBottom();

    scrollTarget &&
      new IntersectionObserver(
        ([entry]) => setOnBottom(!!entry?.isIntersecting),
        { root: list },
      ).observe(scrollTarget);
  });

  mutateEntityHook({
    entity: ChatMessageEP,
    hook: 'on',
    event: MutateEvent.Update,
    callback: (message) => {
      setState(
        'list',
        ({ _id }) => _id === message._id,
        duplicate(message.data),
      );
    },
  });
  mutateEntityHook({
    entity: ChatMessageEP,
    hook: 'on',
    event: MutateEvent.Create,
    callback: ({ data }) => {
      const shouldScroll = onBottom();
      setState('list', (list) => {
        const added = [...list, duplicate(data)];
        if (shouldScroll) added.shift();
        return added
      });
      if (shouldScroll) scrollBottom();
      else setUnseen(unseen() + 1);
    },
  });
  mutateEntityHook({
    entity: ChatMessageEP,
    hook: 'on',
    event: MutateEvent.Delete,
    callback: (message) => {
      setState('list', (list) => list.filter(({ _id }) => _id !== message.id));
    },
  });
  const setSeen = () => {
    if (unseen()) setUnseen(unseen() - 1);
  };
  return (
    <div class={container}>
      <ol class={messages} ref={list}>
        <For each={state.list}>
          {(data) => <ChatMessageItem setSeen={setSeen} data={data} />}
        </For>
        <li class={hiddenItem} ref={scrollTarget}>
          {unseen() && <div class={unseenCount}>Unseen: {unseen()}</div>}
        </li>
      </ol>
    </div>
  );
};
