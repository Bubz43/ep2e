import { css } from 'lit-element';

export const entityFormDetailsStyles = css`
  [slot='details'] > * {
    padding: 0.5rem 1rem;
    border-radius: 3px;
    border: 1px solid var(--color-border);
    background: linear-gradient(45deg, var(--color-bg), var(--color-bg-alt));
  }
`;
