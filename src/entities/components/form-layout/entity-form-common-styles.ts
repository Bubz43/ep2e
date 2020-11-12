import { css } from 'lit-element';

export const entityFormCommonStyles = css`
  [slot='details'] > * {
    padding: 0.5rem 1rem;
    border-radius: 3px;
    border: 1px solid var(--color-border);
    background: linear-gradient(45deg, var(--color-bg), var(--color-bg-alt));
  }

  [slot="details"] > sl-dropzone:not([disabled]) {
    border-style: dashed;
    border-width: 2px;
  }

  entity-form-sidebar-divider + sl-field {
    margin-top: 0.4rem;
  }
`;
