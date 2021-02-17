import { createMessage } from '@src/chat/create-message';
import { openOrRenderWindow } from '@src/components/window/window-controls';
import { ResizeOption } from '@src/components/window/window-options';
import { localize } from '@src/foundry/localization';
import type { MWCMenuOption } from '@src/open-menu';
import { html } from 'lit-html';
import { compact, noop } from 'remeda';
import type { ItemCard } from '../actor/components/character-views/components/cards/generic/item-card';
import { ItemType } from '../entity-types';
import type { ItemProxy, RangedWeapon } from './item';
import type { MeleeWeapon } from './proxies/melee-weapon';
import type { Psi } from './proxies/psi';

export const renderItemForm = (proxy: ItemProxy) => {
  switch (proxy.type) {
    case ItemType.PhysicalTech:
      return html`
        <physical-tech-form .item=${proxy}></physical-tech-form>
        <entity-form-footer
          slot="footer"
          .updater=${proxy.updater.path('data').nestedStore()}
        ></entity-form-footer>
      `;

    case ItemType.MeleeWeapon:
      return html`
        <melee-weapon-form .item=${proxy}></melee-weapon-form>
        <entity-form-footer
          slot="footer"
          .updater=${proxy.updater.path('data').nestedStore()}
        ></entity-form-footer>
      `;

    case ItemType.ThrownWeapon:
      return html`
        <thrown-weapon-form .item=${proxy}></thrown-weapon-form>
        <entity-form-footer
          slot="footer"
          .updater=${proxy.updater.path('data').nestedStore()}
        ></entity-form-footer>
      `;

    case ItemType.FirearmAmmo:
      return html`
        <firearm-ammo-form .item=${proxy}></firearm-ammo-form>
        <entity-form-footer
          slot="footer"
          .updater=${proxy.updater.path('data').nestedStore()}
        ></entity-form-footer>
      `;

    case ItemType.PhysicalService:
      return html`
        <physical-service-form .item=${proxy}></physical-service-form>
        <entity-form-footer
          slot="footer"
          .updater=${proxy.updater.path('data').nestedStore()}
        ></entity-form-footer>
      `;

    case ItemType.Trait:
      return html`
        <trait-form .item=${proxy}></trait-form>
        <entity-form-footer
          slot="footer"
          .updater=${proxy.updater.path('data').nestedStore()}
        ></entity-form-footer>
      `;

    case ItemType.Armor:
      return html`
        <armor-form .item=${proxy}></armor-form>
        <entity-form-footer
          slot="footer"
          .updater=${proxy.updater.path('data').nestedStore()}
        ></entity-form-footer>
      `;

    case ItemType.Software:
      return html`
        <software-form .item=${proxy}></software-form>
        <entity-form-footer
          slot="footer"
          .updater=${proxy.updater.path('data').nestedStore()}
        ></entity-form-footer>
      `;

    case ItemType.Sleight:
      return html`
        <sleight-form .item=${proxy}></sleight-form>
        <entity-form-footer
          slot="footer"
          .updater=${proxy.updater.path('data').nestedStore()}
        ></entity-form-footer>
      `;

    case ItemType.Psi:
      return html`
        <psi-form .item=${proxy}></psi-form>
        <entity-form-footer
          slot="footer"
          .updater=${proxy.updater.path('data').nestedStore()}
        ></entity-form-footer>
      `;

    case ItemType.Substance:
      return html`
        <substance-form .item=${proxy}></substance-form>
        <entity-form-footer
          slot="footer"
          .updater=${proxy.updater.path('data').nestedStore()}
        ></entity-form-footer>
      `;

    case ItemType.Explosive:
      return html`
        <explosive-form .item=${proxy}></explosive-form>
        <entity-form-footer
          slot="footer"
          .updater=${proxy.updater.path('data').nestedStore()}
        ></entity-form-footer>
      `;

    case ItemType.Railgun:
      return html`
        <railgun-form .item=${proxy}></railgun-form>
        <entity-form-footer
          slot="footer"
          .updater=${proxy.updater.path('data').nestedStore()}
        ></entity-form-footer>
      `;

    case ItemType.Firearm:
      return html`
        <firearm-form .item=${proxy}></firearm-form>
        <entity-form-footer
          slot="footer"
          .updater=${proxy.updater.path('data').nestedStore()}
        ></entity-form-footer>
      `;

    case ItemType.SprayWeapon:
      return html`
        <spray-weapon-form .item=${proxy}></spray-weapon-form>
        <entity-form-footer
          slot="footer"
          .updater=${proxy.updater.path('data').nestedStore()}
        ></entity-form-footer>
      `;

    case ItemType.BeamWeapon:
      return html`
        <beam-weapon-form .item=${proxy}></beam-weapon-form>
        <entity-form-footer
          slot="footer"
          .updater=${proxy.updater.path('data').nestedStore()}
        ></entity-form-footer>
      `;

    case ItemType.SeekerWeapon:
      return html`
        <seeker-weapon-form .item=${proxy}></seeker-weapon-form>
        <entity-form-footer
          slot="footer"
          .updater=${proxy.updater.path('data').nestedStore()}
        ></entity-form-footer>
      `;
  }
};

export const openPsiFormWindow = (psi: Psi) => {
  return openOrRenderWindow({
    key: psi.updater,
    content: renderItemForm(psi),
    name: psi.name,
    resizable: ResizeOption.Vertical,
  });
};

export const itemMenuOptions = (item: ItemProxy): MWCMenuOption[] => {
  return compact([
    item.editable &&
      'toggleStashed' in item &&
      (item.type !== ItemType.Substance || !item.appliedState) && {
        label: localize(item.stashed ? 'carry' : 'stash'),
        callback: item.toggleStashed.bind(item),
      },
    'toggleEquipped' in item && {
      label: localize(item.equipped ? 'unequip' : 'equip'),
      callback: item.toggleEquipped.bind(item),
    },
    {
      label: localize('message'),
      icon: html`<mwc-icon>message</mwc-icon>`,
      callback: () => {
        createMessage({
          data: {
            header: {
              heading: item.fullName,
              subheadings: item.fullType,
              description: item.description,
              img: item.nonDefaultImg,
              hidden: item.type === ItemType.Substance && item.appliedAndHidden,
            },
          },
          entity: item.actor,
        });
      },
    },
    item.openForm &&
      (item.type !== ItemType.Substance ||
        game.user.isGM ||
        !item.appliedAndHidden) && {
        label: localize('form'),
        icon: html`<mwc-icon>launch</mwc-icon>`,
        callback: item.openForm,
      },
    item.deleteSelf && {
      label: localize('delete'),
      icon: html`<mwc-icon>delete_forever</mwc-icon>`,
      callback: item.deleteSelf,
      disabled: !item.editable && !item.alwaysDeletable,
    },
  ]);
};

const isWeapon = (item: ItemProxy): item is MeleeWeapon | RangedWeapon => {
  return item.type.includes('Weapon');
};

export const renderItemCard = (
  item: ItemProxy,
  {
    expanded = false,
    noAnimate = false,
    animateInitial = false,
    allowDrag = false,
    handleDragStart = noop,
  }: Pick<
    Partial<ItemCard>,
    'expanded' | 'noAnimate' | 'animateInitial' | 'allowDrag'
  > & { handleDragStart?: (ev: DragEvent) => void },
) => {
  if (item.type === ItemType.PhysicalTech) {
    return html`
      <physical-tech-card
        .item=${item}
        ?expanded=${expanded}
        ?noAnimate=${noAnimate}
        ?animateInitial=${animateInitial}
        ?allowDrag=${allowDrag}
        @dragstart=${handleDragStart}
      ></physical-tech-card>
    `;
  }
  if (isWeapon(item)) {
    return html`
      <weapon-card
        .item=${item}
        ?expanded=${expanded}
        ?noAnimate=${noAnimate}
        ?animateInitial=${animateInitial}
        ?allowDrag=${allowDrag}
        @dragstart=${handleDragStart}
      ></weapon-card>
    `;
  }
  if ('stashed' in item)
    return html`
      <consumable-card
        .item=${item}
        ?expanded=${expanded}
        ?noAnimate=${noAnimate}
        ?animateInitial=${animateInitial}
        ?allowDrag=${item.type === ItemType.Substance && item.appliedState
          ? false
          : allowDrag}
        @dragstart=${handleDragStart}
      ></consumable-card>
    `;
  return html`
    <item-card
      .item=${item}
      ?expanded=${expanded}
      ?noAnimate=${noAnimate}
      ?animateInitial=${animateInitial}
      ?allowDrag=${'temporary' in item && item.temporary ? false : allowDrag}
      @dragstart=${handleDragStart}
    ></item-card>
  `;
};
