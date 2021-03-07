import { openOrRenderWindow } from '@src/components/window/window-controls';
import { ResizeOption } from '@src/components/window/window-options';
import { localize } from '@src/foundry/localization';
import { html } from 'lit-html';
import { ActorType } from '../entity-types';
import type { UpdateStore } from '../update-store';
import type { MaybeToken } from './actor';
import type { Character } from './proxies/character';
import type { Sleeve } from './sleeves';

export const renderCharacterView = (
  proxy: Character,
  token: MaybeToken,
  compact = false,
) => {
  return html`
    <character-view-alt
      .character=${proxy}
      .token=${token}
      ?compact=${compact}
    ></character-view-alt>
    <!-- <character-view .character=${proxy} .token=${token}></character-view> -->
  `;
};

export const openSleeveForm = (sleeve: Sleeve) => {
  return openOrRenderWindow({
    key: sleeve.updater,
    content: renderSleeveForm(sleeve),
    name: `${sleeve.name} - ${localize('sleeve')}`,
    resizable: ResizeOption.Vertical,
  });
};

export const renderSleeveForm = (proxy: Sleeve) => {
  const updater = ((proxy.updater as unknown) as UpdateStore<{
    data: { reference: string };
  }>)
    .path('data')
    .nestedStore();
  switch (proxy.type) {
    case ActorType.Infomorph:
      return html`<infomorph-form .sleeve=${proxy}></infomorph-form>
        <entity-form-footer
          slot="footer"
          .updater=${updater}
        ></entity-form-footer> `;
    case ActorType.Biological:
      return html`<biological-form .sleeve=${proxy}></biological-form>
        <entity-form-footer
          slot="footer"
          .updater=${updater}
        ></entity-form-footer> `;
    case ActorType.Synthetic:
      return html`
        <synthetic-form .sleeve=${proxy}></synthetic-form>
        <entity-form-footer
          slot="footer"
          .updater=${updater}
        ></entity-form-footer>
      `;
  }
};
