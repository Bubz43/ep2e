import { AppRoot } from "./app-root";
import { Button } from "./components/button/button";

AppRoot;
Button;

Hooks.once("ready", async () => {
  requestAnimationFrame(() => document.body.classList.add("ready"));
  document.body.appendChild(new AppRoot())
})