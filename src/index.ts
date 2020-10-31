import { AppRoot } from './app-root';
import { Button } from './components/button/button';

const link = document.createElement('link');
link.rel = 'stylesheet';
link.href = 'systems/ep2e/build/_dist_/global.css';
document.head.appendChild(link);

for (const link of [
  "https://fonts.googleapis.com/css?family=Material+Icons&display=block",
  "https://fonts.googleapis.com/css?family=Roboto:300,400,500",
  "https://fonts.googleapis.com/css?family=Rubik:300,400,700&display=swap",
  "https://fonts.googleapis.com/css?family=Jost:300,400,700&display=swap",
  "https://fonts.googleapis.com/css?family=Spartan:300,400,700&display=swap",
  "https://fonts.googleapis.com/css?family=Fira+Code&display=swap",
]) {
  const fontEl = document.createElement("link");
  fontEl.rel = "stylesheet";
  fontEl.href = link;
  document.head.appendChild(fontEl);
}

// Material Components
import "@material/mwc-button";
import "@material/mwc-icon-button-toggle";
import "@material/mwc-icon-button";
import "@material/mwc-icon";
import "@material/mwc-checkbox";
import "@material/mwc-formfield";
import "@material/mwc-radio";
import "@material/mwc-switch";
import "@material/mwc-slider";
import "@material/mwc-snackbar";
import "@material/mwc-linear-progress";
import "@material/mwc-tab-bar";
import "@material/mwc-list";
import "@material/mwc-list/mwc-list-item";
import "@material/mwc-list/mwc-check-list-item";
import "@material/mwc-list/mwc-radio-list-item";
import "@material/mwc-circular-progress";
import "@material/mwc-menu";

// Weightless Components
import "weightless/label";
import "weightless/list-item";

import "web-dialog";

AppRoot;
Button;

Hooks.once('ready', async () => {
  requestAnimationFrame(() => document.body.classList.add('ready'));
  document.body.appendChild(new AppRoot());
});
