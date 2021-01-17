import { html } from 'lit-html';
import type { Ego } from '../actor/ego';

export const renderEgoForm = (ego: Ego) => html`
  <ego-form .ego=${ego}></ego-form>
  <entity-form-footer
    slot="footer"
    .updater=${ego.updater.path('data').nestedStore()}
  ></entity-form-footer>
`;
