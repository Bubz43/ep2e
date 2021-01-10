import { overlay } from '@src/init';
import { debounceFn } from '@src/utility/decorators';
import { TemplateResult, render } from 'lit-html';
import { traverseActiveElements } from 'weightless';
import { SlWindow } from './window';
import { ResizeOption, SlWindowEventName } from './window-options';

type WindowProps<T> = Pick<SlWindow, 'name' | 'img' | 'resizable'> & {
  renderTemplate: (props: T) => TemplateResult;
  renderProps: T;
  cleanup: () => void;
  relativeElement?: Element | null;
};

export class WindowController<T> {
  readonly win = new SlWindow();
  private cleanup;
  private readonly renderTemplate;
  constructor(initialProps: WindowProps<T>) {
    this.cleanup = initialProps.cleanup;
    this.renderTemplate = initialProps.renderTemplate;
    this.update(initialProps);
    this.win.addEventListener(SlWindowEventName.Closed, () => this.cleanup());
    overlay.append(this.win);
  }

  update(props: Partial<Omit<WindowProps<T>, 'renderTemplate'>>) {
    if (props.name) this.win.name = props.name;
    if ('img' in props) this.win.img = props.img;
    if (props.resizable) this.win.resizable = props.resizable;
    if (props.cleanup) this.cleanup = props.cleanup;
    if (props.renderProps)
      render(this.renderTemplate(props.renderProps), this.win);
    if (props.relativeElement instanceof HTMLElement)
      this.win.positionAdjacentToElement(props.relativeElement);
  };
}

export const attachWindow = <T>(initialProps: WindowProps<T>) => {
  return new WindowController(initialProps)
};

type WinState<S, D> = {
  unsub?: () => void;
  called: boolean;
  controller?: WindowController<D>;
  open?: (subData: S | null) => void;
  readonly relative: Element | null;
  cleanup: () => void;
};

// export const attachWindowFactory = <Key extends object, D, S = WinState<Key, D>>(setupOpen: (state: S) => (obj: S | null) => void) => {
//   const factory = new WeakMap<Key, S>();
//   const get = (key: Key) => {
//     const state = factory.get(key);
//     if (state) {
//       state.called = true;
//       state.open?.(key)
//     } else {
//       const state: S = {
//         called: true,
//         cleanup() {
//           factory.delete(key);
//           this.unsub?.();
//           delete this.controller;
//         },
//         get relative() {
//           return this.called ? traverseActiveElements() : null;
//         },
//       }

//       state.open = setupOpen(state)

//     }
//   }
// }

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
  renderOnly: boolean;
}>;

export const openWindow = (
  { key, content, name, forceFocus, adjacentEl, img }: WindowOpenSettings,
  { resizable = ResizeOption.None, renderOnly = false }: WindowOpenOptions = {},
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
