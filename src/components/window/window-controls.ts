import { debounceFn } from '@src/utility/decorators';
import { TemplateResult, render } from 'lit-html';
import { SlWindow } from './window';
import { ResizeOption, SlWindowEventName } from './window-options';

const windows = new WeakMap<object, SlWindow>();

export type WindowOpenSettings = {
  key: object;
  content: TemplateResult;
  name: SlWindow['name'];
  forceFocus?: boolean;
  adjacentEl?: HTMLElement | null | false;
};

export type WindowOpenOptions = Partial<{
  resizable: SlWindow['resizable'];
  clearContentOnClose: boolean;
}>;

export const openWindow = (
  { key, content, name, forceFocus, adjacentEl }: WindowOpenSettings,
  {
    resizable = ResizeOption.None,
    clearContentOnClose = false,
  }: WindowOpenOptions = {},
) => {
  let win = windows.get(key);
  const windowExisted = !!win;
  if (!win) {
    win = new SlWindow();
    windows.set(key, win);
  }

  win.name = name;
  win.resizable = resizable;
  win.clearContentOnClose = clearContentOnClose;
  render(content, win);

  if (adjacentEl) win.positionAdjacentToElement(adjacentEl);

  const wasConnected = win?.isConnected;
  if (!wasConnected) {
    SlWindow.container.append(win);
    win.minimized = false;
  } else if (forceFocus) {
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
