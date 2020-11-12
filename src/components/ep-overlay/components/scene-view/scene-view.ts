import { IconButton } from '@material/mwc-icon-button';
import {
  activeEnvironmentInfo,
  getCurrentEnvironment,
} from '@src/features/environment';
import { navMenuListener } from '@src/foundry/foundry-apps';
import {
  MutateEvent,
  mutateEntityHook,
  mutatePlaceableHook,
} from '@src/foundry/hook-setups';
import { localize } from '@src/foundry/localization';
import { activeCanvas } from '@src/foundry/misc-helpers';
import { gameSettings, overlay } from '@src/init';
import { customElement, LitElement, property, html } from 'lit-element';
import { render } from 'lit-html';
import { styleMap } from 'lit-html/directives/style-map';
import { openDialog } from 'web-dialog';
import styles from './scene-view.scss';

@customElement('scene-view')
export class SceneView extends LitElement {
  static get is() {
    return 'scene-view' as const;
  }

  static styles = [styles];

  private environmentUnsub: (() => void) | null = null;

  connectedCallback() {
    super.connectedCallback();
    this.toggleHooks('on');
    this.environmentUnsub = gameSettings.environment.listener(
      this.updateFromHook,
    );
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.toggleHooks('off');
    this.environmentUnsub?.();
    this.environmentUnsub = null;
  }

  private updateFromHook = () => {
    this.requestUpdate();
  };

  private toggleHooks(hook: 'on' | 'off') {
    const { updateFromHook: callback } = this;
    Hooks[hook]('canvasReady', callback);
    for (const event of [MutateEvent.Update, MutateEvent.Delete]) {
      mutateEntityHook({ entity: Scene, hook, event, callback });
    }
    for (const event of [
      MutateEvent.Create,
      MutateEvent.Update,
      MutateEvent.Delete,
    ]) {
      mutatePlaceableHook({ entity: Token, hook, event, callback });
    }
  }

  private openFormsDialog() {
    if (!game.user.isGM) return;
    openDialog({
      $content: (dialog) => {
        dialog.style.setProperty('--dialog-width:', '600px');
        dialog.style.zIndex = '50';
        dialog.slot = 'foundry-apps';
        return render(html`<environment-forms></environment-forms>`, dialog);
      },
      center: true,
      $container: overlay,
    });
  }

  private openSceneMenu(ev: MouseEvent) {
    if (ev.target instanceof IconButton) {
      navMenuListener(ev);
    }
  }

  render() {
    const { isGM } = game.user;
    const { name, img, gravity, vacuum, notes } = getCurrentEnvironment();

    return html`
      <link
        rel="stylesheet"
        href="fonts/fontawesome/css/all.min.css"
        media="all"
      />

      <!-- ${this.renderActiveScene()} -->

      ${isGM
        ? html`
            <mwc-icon-button
              icon="ac_unit"
              @click=${this.openFormsDialog}
            ></mwc-icon-button>
          `
        : ''}

      <sl-group label=${localize('gravity')}>${gravity}</sl-group>

      ${vacuum ? html`<span>${localize('inVacuum')}</span>` : ''}
    `;
  }

  private renderActiveScene() {
    const canvas = activeCanvas();
    const { scene } = canvas || {};
    if (!scene) return '';
    const { fullSceneName } = scene;

    return html`
      <div class="scene" data-scene-id=${scene.id} @click=${this.openSceneMenu}>
        <h4 class="scene-name">
          ${scene.active
            ? html`<i class="fas fa-bullseye"></i>`
            : ''}${fullSceneName}
        </h4>
        ${game.user.isGM ? html`
        <mwc-icon-button class="menu" icon="more_vert"></mwc-icon-button>
        ` : ""}
        <ul class="scene-players">
          ${[...game.users].map((user) => {
            if (!user.active || user.viewedScene !== scene.id) return '';
            return html`
              <li class="scene-player" style="background: ${user.data.color};">
                ${user.name[0]}
              </li>
            `;
          })}
        </ul>
    
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'scene-view': SceneView;
  }
}
