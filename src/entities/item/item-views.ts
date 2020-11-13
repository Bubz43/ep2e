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

    case ItemType.MeleeWeapon:
      return html`
        <melee-weapon-form .item=${proxy}></melee-weapon-form>
        <entity-form-footer
          slot="footer"
          .updater=${proxy.updater.prop('data').nestedStore()}
        ></entity-form-footer>
      `;
    
    case ItemType.ThrownWeapon:
      return html`
        <thrown-weapon-form .item=${proxy}></thrown-weapon-form>
        <entity-form-footer
          slot="footer"
          .updater=${proxy.updater.prop('data').nestedStore()}
        ></entity-form-footer>
      `;
    
    case ItemType.FirearmAmmo:
      return html`
        <firearm-ammo-form .item=${proxy}></firearm-ammo-form>
        <entity-form-footer
          slot="footer"
          .updater=${proxy.updater.prop('data').nestedStore()}
        ></entity-form-footer>
      `;



    case ItemType.PhysicalService:
      return html`
        <physical-service-form .item=${proxy}></physical-service-form>
        <entity-form-footer
          slot="footer"
          .updater=${proxy.updater.prop('data').nestedStore()}
        ></entity-form-footer>
      `;

    case ItemType.Trait:
      return html`
        <trait-form .item=${proxy}></trait-form>
        <entity-form-footer
          slot="footer"
          .updater=${proxy.updater.prop('data').nestedStore()}
        ></entity-form-footer>
      `;

    case ItemType.Sleight:
      return html`
        <sleight-form .item=${proxy}></sleight-form>
        <entity-form-footer
          slot="footer"
          .updater=${proxy.updater.prop('data').nestedStore()}
        ></entity-form-footer>
      `;

    case ItemType.Psi:
      return html`
        <psi-form .item=${proxy}></psi-form>
        <entity-form-footer
          slot="footer"
          .updater=${proxy.updater.prop('data').nestedStore()}
        ></entity-form-footer>
      `;
    
    case ItemType.Substance:
      return html`
        <substance-form .item=${proxy}></substance-form>
        <entity-form-footer
          slot="footer"
          .updater=${proxy.updater.prop('data').nestedStore()}
        ></entity-form-footer>
      `;
    
    case ItemType.Explosive:
      return html`
        <explosive-form .item=${proxy}></explosive-form>
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
    { resizable: ResizeOption.Vertical },
  );
};
