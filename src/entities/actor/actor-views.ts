import { localize } from '@src/foundry/localization';
import { html } from 'lit-html';
import { ActorType } from '../entity-types';
import type { MaybeToken } from './actor';
import type { Character } from './proxies/character';
import type { Sleeve } from './sleeves';

export const renderCharacterView = (proxy: Character, token: MaybeToken) => {
  return '';
};

export const renderSleeveForm = (proxy: Sleeve, token: MaybeToken) => {
  return html`
    <!-- <entity-form-header
      .updater=${proxy.updater}
      type=${localize(proxy.type)}
    >
      ${proxy.sleeved ? html` <li slot="tag">${localize('sleeved')}</li> ` : ''}
    </entity-form-header> -->
    ${renderSpecificSleeveForm(proxy, token)}
  `;
};

const renderSpecificSleeveForm = (proxy: Sleeve, token: MaybeToken) => {
  switch (proxy.type) {
    case ActorType.Infomorph:
      return html`<infomorph-form
          .sleeve=${proxy}
          .token=${token}
        ></infomorph-form>
        <entity-form-footer
          slot="footer"
          .updater=${proxy.updater.prop('data').nestedStore()}
        ></entity-form-footer> `;
    case ActorType.Biological:
      return html`<biological-form .sleeve=${proxy} .token=${token}></biological-form>
        <entity-form-footer
          slot="footer"
          .updater=${proxy.updater.prop('data').nestedStore()}
        ></entity-form-footer> `;
    case ActorType.SyntheticShell:
      return html`
        <entity-form-footer
          slot="footer"
          .updater=${proxy.updater.prop('data').nestedStore()}
        ></entity-form-footer> `;
  }
};
