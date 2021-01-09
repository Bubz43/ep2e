import { ChatMessageEP } from '@src/entities/chat-message';
import { mutateEntityHook, MutateEvent } from '@src/foundry/hook-setups';
import { colorFunctions } from '@src/theme/css-vars';
import { containedCSS as css } from '@src/theme/emotion';
import { nonNegative, notEmpty } from '@src/utility/helpers';
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
  padding: 0 0 0 0.75rem;
  pointer-events: all;
  justify-items: center;
`;

const hiddenItem = css`
  border: 1px solid transparent;
`;

const unseenCount = css`
  position: fixed;
  padding: 0.25rem 0.5rem;
  border-radius: 7px;
  box-shadow: 0 0 4px black;
  cursor: pointer;
  font-size: large;
  text-align: center;
  background: ${colorFunctions.alphav('--color-grey', 0.75)};
  bottom: 1.5rem;
  left: 2rem;
  z-index: 50;
`;

export const ChatLogEP: Component = () => {
  const [state, setState] = createState({
    list: [...game.messages.values()]
      .slice(-CONFIG.ChatMessage.batchSize)
      .map((message) => duplicate(message.data)),
  });
  const [onBottom, setOnBottom] = createSignal(false);
  const [unseen, setUnseen] = createSignal(0);
  const [scrollSibling, setScrollSibling] = createSignal<
    Element | null | undefined
  >(null);
  let list: HTMLElement | undefined = undefined;
  let scrollTarget: HTMLLIElement | undefined = undefined;
  let listStart: HTMLElement | undefined = undefined;

  const scrollBottom = () => {
    requestAnimationFrame(() => scrollTarget?.scrollIntoView());

  };

  createEffect(() => {
    if (scrollSibling()) {
      scrollSibling()?.scrollIntoView();
      setScrollSibling(null);
    }
  });

  createEffect(() => {
    if (onBottom()) {
      setState("list", list => list.slice(-CONFIG.ChatMessage.batchSize))
      setUnseen(0);
    }
  })

  onMount(() => {
    scrollBottom();

    scrollTarget &&
      new IntersectionObserver(
        ([entry]) => setOnBottom(!!entry?.isIntersecting),
        { root: list },
      ).observe(scrollTarget);

    listStart &&
      new IntersectionObserver(
        ([entry]) => {
          if (entry?.isIntersecting) {
            const messages = [...game.messages.values()];
            const startIndex = messages.findIndex(
              (i) => i._id === state.list[0]?._id,
            );
            if (startIndex > 0) {
              const slice = messages.slice(
                nonNegative(startIndex - CONFIG.ChatMessage.batchSize),
                startIndex,
              );
              if (notEmpty(slice)) {
                setScrollSibling(listStart?.nextElementSibling);
                setState('list', (list) => [
                  ...slice.map((m) => duplicate(m.data)),
                  ...list,
                ]);
              }
            }
          }
        },
        { root: list },
      ).observe(listStart);
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
        return added;
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
        <li class={hiddenItem} ref={listStart}></li>
        <For each={state.list}>
          {(data) => <ChatMessageItem setSeen={setSeen} data={data} />}
        </For>
        <li class={hiddenItem} ref={scrollTarget}>
          {unseen() && (
            <div onClick={scrollBottom} class={unseenCount}>
              Unseen: {unseen()}
            </div>
          )}
        </li>
      </ol>
    </div>
  );
};
