import { AppRoot } from './app-root';
import { Button } from './components/button/button';
AppRoot;
Button;

Hooks.once('ready', async () => {
  requestAnimationFrame(() => document.body.classList.add('ready'));
  document.body.appendChild(new AppRoot());
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'systems/ep2e/build/_dist_/global.css';
  document.head.appendChild(link);
});
