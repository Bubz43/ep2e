import { openWindow } from '@src/components/window/window-controls';
import { ResizeOption } from '@src/components/window/window-options';
import { html } from 'lit-html';
import { ItemType } from '../entity-types';
import type { ItemProxy } from './item';
import type { Psi } from './proxies/psi';

export const renderItemForm = (proxy: ItemProxy) => {
  switch (proxy.type) {
    case ItemType.PhysicalTech:
      return html`
        <physical-tech-form .item=${proxy}></physical-tech-form>
        <entity-form-footer
          slot="footer"
          .updater=${proxy.updater.prop('data').nestedStore()}
        ></entity-form-footer>
      `;

    default:
      return html``;
  }
};


export const openPsiFormWindow = ({
  psi,
  forceFocus,
  adjacentEl,
}: {
  psi: Psi;
  forceFocus?: boolean;
  adjacentEl?: HTMLElement;
}) => {
  return openWindow(
    {
      key: psi.updater,
      content: renderItemForm(psi),
      name: psi.name,
      forceFocus,
      adjacentEl,
    },
    { resizable: ResizeOption.Vertical }
  );
};
