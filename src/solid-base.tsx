import type { Component } from 'solid-js';
import { containedCSS as css } from '@src/theme/emotion';
import { ChatLogEP } from './chat/components/ChatLogEP';

// const testWindow = css`
//   pointer-events: all;
// `;

// const container = css`
//   padding: 3rem;
// `;

export const SolidBase: Component = () => {
  return (
    <>
      <ChatLogEP />
    </>
  );
};
