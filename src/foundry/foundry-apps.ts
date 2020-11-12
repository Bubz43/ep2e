import { reposition } from 'nanopop';
import { findMatchingElement, repositionIfNeeded } from '@src/utility/dom';
import { convertMenuOptions } from './misc-helpers';
import { openMenu } from '@src/open-menu';

export enum NotificationType {
  Info = 'info',
  Warn = 'warn',
  Error = 'error',
}

export const notify = (
  type: NotificationType,
  message: string,
  { permanent = false } = {},
) => {
  ui.notifications.notify(message, type, { permanent });
};

type PositionableApp = Pick<Application, 'element' | 'position'>;

export const positionApp = async <T extends PositionableApp>(
  app: T,
  relative: HTMLElement,
) => {
  const rect = relative.getBoundingClientRect();
  if (!rect.top && !rect.left) return;
  let tries = 0;
  while (tries < 200 && !app.element?.[0]?.isConnected) {
    await new Promise((r) => requestAnimationFrame(r));
    ++tries;
  }
  const [element] = (app.element || []) as JQuery;
  if (element instanceof HTMLElement) {
    reposition(relative, element, { position: 'left' });
    updateAppPositionFromEl(app, element);
  }
};

export const confirmFloatingAppPositions = () => {
  Object.values(ui.windows).forEach(async (v) => {
    if (!(v instanceof Application)) return;
    const [el] = v.element || [];
    const moved = el instanceof HTMLElement && (await repositionIfNeeded(el));
    moved && updateAppPositionFromEl(v, el);
  });
};

const updateAppPositionFromEl = <T extends PositionableApp>(
  app: T,
  el: HTMLElement,
) => {
  const { top, left } = el.getBoundingClientRect();
  app.position.left = left;
  app.position.top = top - 3;
};

const pickers = new WeakMap<object, FilePicker>();

export const openImagePicker = (
  key: object,
  currentSrc: string,
  callback: (path: string) => void,
) => {
  const picker = pickers.get(key);
  if (picker?.rendered) closeImagePicker(key);
  else {
    const newPicker = new FilePicker({
      type: 'image',
      current: currentSrc,
      callback,
    });

    pickers.set(key, newPicker);
    newPicker.browse(currentSrc, {});
  }
};

export const closeImagePicker = (key: object) => {
  const picker = pickers.get(key);
  if (picker) {
    picker.close({});
    pickers.delete(key);
  }
};

export const navMenuListener = (ev: MouseEvent) => {
  const item = findMatchingElement(ev, '.scene');
  if (!item) return;
  const contextOptions = ui.nav._getContextMenuOptions();
  Hooks.call('getSceneNavigationContext', ui.nav.element, contextOptions);
  const targetEl = $(item);
  const convertedOptions = convertMenuOptions(contextOptions, targetEl);
  const heading = item
    .querySelector<HTMLElement>('.scene-name')
    ?.textContent?.trim();
  openMenu({
    content: convertedOptions,
    position: ev,
    header: heading ? { heading } : undefined,
  });
};
