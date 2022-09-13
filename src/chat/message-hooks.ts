import type { ChatMessageEP } from '@src/entities/chat-message';
import {
  ActorIdentifiers,
  findActor,
  findToken,
} from '@src/entities/find-entities';
import { mutateEntityHook, MutateEvent } from '@src/foundry/hook-setups';
import { isGamemaster } from '@src/foundry/misc-helpers';
import { addEPSocketHandler } from '@src/foundry/socket';
import { EP } from '@src/foundry/system';
import { html, nothing, render } from 'lit-html';
import { unsafeHTML } from 'lit-html/directives/unsafe-html';
import { mapKeys } from 'remeda';
import { messageContentPlaceholder } from './create-message';

const createdChatMessages = new WeakSet<ChatMessage>();
const updatedChatMessages = new WeakSet<ChatMessage>();

mutateEntityHook({
  entity: ChatMessage,
  hook: 'on',
  event: MutateEvent.Create,
  callback: (message) => createdChatMessages.add(message),
});

mutateEntityHook({
  entity: ChatMessage,
  hook: 'on',
  event: MutateEvent.Update,
  callback: (message) => updatedChatMessages.add(message),
});

const iconTemplate = html`<i
  class="far fa-eye-slash"
></i>`.getTemplateElement();

addEPSocketHandler('messageData', (data) => {
  if (isGamemaster()) {
    game.messages.get(data._id)?.update(data);
  }
});

let ready = false;

const messageQueue = new Map<JQuery, ChatMessageEP>();

Hooks.once('ep-ready', () => {
  ready = true;
  for (const [j, message] of messageQueue) {
    onChatMessageRender(message, j);
  }

  messageQueue.clear();
});

const scrollBottom = () => {
  ui.chat.scrollBottom();
  (ui.chat._popout as ChatLog | undefined)?.scrollBottom();
};

export const onChatMessageRender = (message: ChatMessageEP, j: JQuery) => {
  const [el] = j;
  if (!el) return;
  if (!ready) {
    messageQueue.set(j, message);
    return;
  }

  const content = el.querySelector<HTMLElement>('.message-content')!;
  const { speaker, whisper, blind, flags } = message;
  const epData = flags[EP.Name];

  // TODO mapKeys but with typescript string const
  const speakerToId = mapKeys(speaker, (k) => k + 'Id') as ActorIdentifiers;

  const img = speakerToId.tokenId
    ? findToken(speakerToId)?.texture.src
    : speakerToId.actorId
    ? findActor(speakerToId)?.img
    : message.user?.avatar;

  const fragment = new DocumentFragment();

  render(
    html`
      <div class="image-wrapper">
        <img src=${img || CONST.DEFAULT_TOKEN} loading="lazy" width="32px" />
      </div>
    `,
    fragment,
  );
  el.querySelector('.message-header')?.append(fragment);

  // TODO This is wonky if message is whisper
  if (message.user && message.user.name !== message.alias) {
    el.querySelector('.message-sender')?.setAttribute(
      'data-author',
      message.user.name,
    );
  }

  // if (message.roll && message.isContentVisible) {
  //   el.querySelector('.dice-roll')?.setAttribute('draggable', 'true');
  //   el.addEventListener('dragstart', (ev) => message.setRollDrag(ev));
  // }

  if (el.matches('.blind, .whisper')) {
    el.querySelector('.message-metadata')?.prepend(
      iconTemplate.content.cloneNode(true),
    );
  }

  el.style.setProperty('--author-color', message.user?.color || 'currentColor');

  if (epData) {
    // TODO add from before header
    const { innerHTML } = content;
    const showContent =
      !message.isRoll && innerHTML.trim() !== messageContentPlaceholder;

    render(
      html`
        <message-content .message=${message} .data=${epData}>
          ${showContent ? unsafeHTML(innerHTML) : nothing}
        </message-content>
      `,
      content,
    );
  } else content.classList.add('non-ep');

  if (updatedChatMessages.has(message)) {
    el.addEventListener(
      'animationend',
      () => {
        el.classList.remove('updated');
        updatedChatMessages.delete(message);
      },
      { once: true },
    );
    el.classList.add('updated');

    requestAnimationFrame(scrollBottom);
  } else if (createdChatMessages.has(message)) {
    el.addEventListener('animationend', () => el.classList.remove('new'), {
      once: true,
    });
    el.classList.add('new');
    requestAnimationFrame(() => {
      createdChatMessages.delete(message);
      scrollBottom();
    });
  }
};
