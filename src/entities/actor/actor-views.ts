import { openOrRenderWindow } from '@src/components/window/window-controls';
import { ResizeOption } from '@src/components/window/window-options';
import { html } from 'lit-html';
import { ActorType } from '../entity-types';
import type { MaybeToken } from './actor';
import type { Character } from './proxies/character';
import type { Sleeve } from './sleeves';

export const renderCharacterView = (proxy: Character, token: MaybeToken) => {
  return html`
    <character-view .character=${proxy} .token=${token}></character-view>
  `;
};

export const openSleeveForm = (sleeve: Sleeve) => {
  return openOrRenderWindow({
    key: sleeve.updater,
    content: renderSleeveForm(sleeve),
    name: sleeve.name,
    resizable: ResizeOption.Vertical,
  });
};

export const renderSleeveForm = (proxy: Sleeve) => {
  switch (proxy.type) {
    case ActorType.Infomorph:
      return html`<infomorph-form .sleeve=${proxy}></infomorph-form>
        <entity-form-footer
          slot="footer"
          .updater=${proxy.updater.prop('data').nestedStore()}
        ></entity-form-footer> `;
    case ActorType.Biological:
      return html`<biological-form .sleeve=${proxy}></biological-form>
        <entity-form-footer
          slot="footer"
          .updater=${proxy.updater.prop('data').nestedStore()}
        ></entity-form-footer> `;
    case ActorType.SyntheticShell:
      return html`
        <synthetic-form .sleeve=${proxy}></synthetic-form>
        <entity-form-footer
          slot="footer"
          .updater=${proxy.updater.prop('data').nestedStore()}
        ></entity-form-footer>
      `;
  }
};
