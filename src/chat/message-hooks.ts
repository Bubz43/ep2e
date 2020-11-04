import type { ChatMessageEP } from '@src/entities/chat-message';
import {
  ActorIdentifiers,
  findToken,
  findActor,
} from '@src/entities/find-entities';
import { mutateEntityHook, MutateEvent } from '@src/foundry/hook-setups';
import { EP } from '@src/foundry/system';
import { html, render, nothing } from 'lit-html';
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

export const onChatMessageRender = (message: ChatMessageEP, [el]: JQuery) => {
  const content = el.querySelector<HTMLElement>('.message-content')!;
  const { speaker, whisper, blind, flags } = message.data;
  const epData = flags[EP.Name];

  const speakerToId = mapKeys(speaker, (k) => k + 'Id') as ActorIdentifiers;

  const img = speakerToId.tokenId
    ? findToken(speakerToId)?.data.img
    : speakerToId.actorId
    ? findActor(speakerToId)?.img
    : message.user?.avatar;
  if (img) {
    el.style.setProperty('--header-icon', `url("/${img}")`);
    el.classList.add('has-icon');
  }

  // TODO This is wonky if message is whisper
  if (message.user && message.user.name !== message.alias) {
    el.querySelector('.message-sender')?.setAttribute(
      'data-author',
      message.user.name,
    );
  }

  if (message.roll && message.isContentVisible) {
    el.querySelector('.dice-roll')?.setAttribute('draggable', 'true');
    el.addEventListener('dragstart', (ev) => message.setRollDrag(ev));
  }

  if (el.matches('.blind, .whisper')) {
    el.querySelector('.message-metadata')?.prepend(
      iconTemplate.content.cloneNode(true),
    );
  }

  el.style.setProperty(
    '--author-color',
    message.user?.data.color || 'currentColor',
  );

  if (epData) {
    const { innerHTML } = content;
    const showContent =
      !message.roll && innerHTML.trim() !== messageContentPlaceholder;
    render(
      html`
        <message-content
          .message=${message}
          .data=${epData}
          ?blind=${blind && !whisper.includes(game.user.id)}
          ?new=${createdChatMessages.has(message)}
        >
          ${showContent ? unsafeHTML(innerHTML) : nothing}
        </message-content>
      `,
      content,
    );
  } else {
    render(
      html`
        <div class="non-ep-content">${unsafeHTML(content.innerHTML)}</div>
      `,
      content,
    );
  }

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
  } else if (createdChatMessages.has(message)) {
    el.addEventListener('animationend', () => el.classList.remove('new'), {
      once: true,
    });
    el.classList.add('new');
    requestAnimationFrame(() => createdChatMessages.delete(message));
  }

  requestAnimationFrame(() => el.scrollIntoView());
};