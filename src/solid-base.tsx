import type { Component } from 'solid-js';
import { containedCSS as css } from '@src/theme/emotion';
import { Portal } from 'solid-js/web';
import { overlay } from './init';

const testWindow = css`
  pointer-events: all;
`;

const container = css`
  padding: 3rem;
`;

export const SolidBase: Component = () => {
  return (
      <sl-window name="solid test" class={testWindow}>
        <div class={container}>
          <mwc-button>Here is a button</mwc-button>
        </div>
      </sl-window>
  );
};
