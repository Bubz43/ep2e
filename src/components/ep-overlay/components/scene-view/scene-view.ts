import { getCurrentEnvironment } from '@src/features/environment';
import {
  mutateEntityHook,
  MutateEvent,
  mutatePlaceableHook,
} from '@src/foundry/hook-setups';
import { localize } from '@src/foundry/localization';
import { gameSettings } from '@src/init';
import { RenderDialogEvent } from '@src/open-dialog';
import { customElement, html, LitElement } from 'lit-element';
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
    this.dispatchEvent(
      new RenderDialogEvent(html`
        <mwc-dialog hideActions open style="--mdc-dialog-min-width: 600px">
          <environment-forms></environment-forms>
        </mwc-dialog>
      `),
    );
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
}

declare global {
  interface HTMLElementTagNameMap {
    'scene-view': SceneView;
  }
}
