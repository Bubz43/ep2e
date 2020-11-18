import { Dialog } from '@material/mwc-dialog';
import { nothing, render } from 'lit-html';
import { traverseActiveElements } from 'weightless';
import { overlay } from './init';

let focusSource: Element | null = null;

export const openDialog = (content: (dialog: Dialog) => void) => {
  focusSource = traverseActiveElements();
  let dialog = overlay.querySelector('mwc-dialog');
  if (!dialog) {
    dialog = new Dialog();
    dialog.style.zIndex = '50'
    dialog.slot = "foundry-apps";
    overlay.append(dialog);
    dialog.addEventListener('closed', () => {
      if (focusSource?.isConnected && focusSource instanceof HTMLElement) {
        focusSource.focus();
      }
      dialog && render(nothing, dialog)
    });
  }
  dialog.style.setProperty('--mdc-dialog-min-width', null);
  dialog.heading = '';
  dialog.stacked = false;
  content(dialog);
  dialog.open = true;
};
