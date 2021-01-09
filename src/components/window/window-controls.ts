import { debounceFn } from '@src/utility/decorators';
import { TemplateResult, render } from 'lit-html';
import { traverseActiveElements } from 'weightless';
import { SlWindow } from './window';
import { ResizeOption, SlWindowEventName } from './window-options';

const windows = new WeakMap<object, SlWindow>();

export type WindowOpenSettings = {
  key: object;
  content: TemplateResult;
  name: SlWindow['name'];
  img?: string;
  forceFocus?: boolean;
  adjacentEl?: Element | null | false;
};

export type WindowOpenOptions = Partial<{
  resizable: SlWindow['resizable'];
  clearContentOnClose: boolean;
  renderOnly: boolean;
}>;

export const openWindow = (
  { key, content, name, forceFocus, adjacentEl, img }: WindowOpenSettings,
  {
    resizable = ResizeOption.None,
    clearContentOnClose = false,
    renderOnly = false,
  }: WindowOpenOptions = {},
) => {
  let win = windows.get(key);
  const windowExisted = !!win;
  if (!win) {
    win = new SlWindow();
    windows.set(key, win);
  }

  win.name = name;
  win.img = img;
  win.resizable = resizable;
  win.clearContentOnClose = clearContentOnClose;
  render(content, win);

  const wasConnected = win?.isConnected;
  const apply = !wasConnected || !renderOnly;
  if (apply && adjacentEl instanceof HTMLElement)
    win.positionAdjacentToElement(adjacentEl);

  if (!wasConnected) {
    SlWindow.container.append(win);
    win.minimized = false;
  } else if (forceFocus && apply) {
    win.minimized = false;
    ignorePointerDown = true;
    win.gainFocus();
    resetPointerDownIgnore();
  }
  return { win, windowExisted, wasConnected };
};
openWindow.container = document.body;

export const closeWindow = (key: object) => {
  const win = windows.get(key);
  const existed = !!win;
  return win?.isConnected
    ? new Promise<boolean>((resolve) => {
        win.addEventListener(SlWindowEventName.Closed, () => resolve(existed), {
          once: true,
        });
        win.close();
      })
    : existed;
};

export const openOrRenderWindow = ({
  key,
  content,
  name,
  resizable,
}: {
  key: Object;
  content: TemplateResult;
  name: string;
  resizable: ResizeOption;
}) => {
  return openWindow(
    {
      key,
      content,
      name,
      forceFocus: true,
      adjacentEl: traverseActiveElements(),
    },
    { resizable, renderOnly: true },
  );
};

export const getWindow = (key: Object) => {
  return windows.get(key);
};

let ignorePointerDown = false;

const resetPointerDownIgnore = debounceFn(
  () => (ignorePointerDown = false),
  150,
);

export let lastClickedEl: HTMLElement | null = null;

document.body.addEventListener('pointerdown', (ev: Event) => {
  const { target } = ev;
  lastClickedEl = target instanceof HTMLElement ? target : null;
  if (ignorePointerDown) return;
  const { focusedWindow } = SlWindow;
  if (
    focusedWindow &&
    !ev.composedPath().some((el) => el instanceof SlWindow)
  ) {
    SlWindow.unfocus(focusedWindow);
  }
});
