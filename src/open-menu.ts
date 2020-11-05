import { Menu } from '@material/mwc-menu';
import { render, nothing, html, TemplateResult } from 'lit-html';
import { ifDefined } from 'lit-html/directives/if-defined';
import type { ValOrValFN } from './utility/helper-types';
import { clickIfEnter } from './utility/helpers';

type OptionBase = {
  label: string | number | TemplateResult;
  icon?: TemplateResult;
  disabled?: ValOrValFN<boolean>;
  title?: string;
};

export type MenuOption = OptionBase & {
  callback: (ev: Event) => unknown;
};

export type MenuDivider = 'divider';

const setupMenu = () => {
  const menu = new Menu();
  menu.addEventListener('closed', () => render(nothing, menu));
  document.body.append(menu);
  menu.fixed = true;
  // menu.quick = true;
  return menu;
};

type MWCMenuOption =
  | (MenuOption & { activated?: boolean; sublabel?: string })
  | MenuDivider;

const renderMenuOption = (option: MWCMenuOption) => {
  if (option === 'divider') return html`<li divider></li>`;
  const {
    label,
    callback,
    disabled: disable,
    icon,
    activated = false,
    sublabel,
  } = option;
  return html`
    <mwc-list-item
      @keydown=${clickIfEnter}
      graphic="icon"
      ?activated=${activated}
      ?disabled=${!!(typeof disable === 'function' ? disable() : disable)}
      ?twoline=${!!sublabel}
      @click=${callback}
    >
      ${typeof icon === 'string'
        ? html`<mwc-icon slot="graphic">${icon}</mwc-icon>`
        : icon
        ? html` <span slot="graphic">${icon}</span> `
        : ''}
      <span>${label}</span>
      ${sublabel ? html` <span slot="secondary">${sublabel}</span> ` : ''}
    </mwc-list-item>
  `;
};

export const openMenu = ({
  content,
  position,
  header,
}: {
  content: TemplateResult | MWCMenuOption[];
  position:
    | HTMLElement
    | { x: number; y: number; currentTarget: EventTarget | null };
  header?: { heading: string; subheading?: string; img?: string } | null;
}) => {
  if (Array.isArray(content) && content.length === 0) return;
  const menu = document.querySelector('mwc-menu') || setupMenu();

  if (menu.open) {
    menu.close();
    setTimeout(() => openMenu({ content, position, header }), 100);
    return;
  }

  if (position instanceof HTMLElement) {
    const { top, left } = position.getBoundingClientRect();
    menu.x = top / 2;
    menu.x = left / 2;
  } else {
    if (
      !position.x &&
      !position.y &&
      position.currentTarget instanceof HTMLElement
    ) {
      const { top, left } = position.currentTarget.getBoundingClientRect();
      menu.x = top;
      menu.x = left;
    } else {
      menu.x = position.x / 2;
      menu.y = position.y / 2;
    }
  }

  render(
    html`
      ${header
        ? html`
            <mwc-list-item
              graphic=${ifDefined(header.img ? 'icon' : undefined)}
              ?twoline=${!!header.subheading}
              noninteractive
            >
              <span>${header.heading}</span>
              ${header.subheading
                ? html`<span slot="secondary">${header.subheading}</span>`
                : ''}
              ${header.img
                ? html`<img src=${header.img} slot="graphic" />`
                : ''}
            </mwc-list-item>
            <li divider></li>
          `
        : ''}
      ${content instanceof TemplateResult
        ? content
        : content.map(renderMenuOption)}
    `,
    menu,
  );
  requestAnimationFrame(() => menu.show());
};
