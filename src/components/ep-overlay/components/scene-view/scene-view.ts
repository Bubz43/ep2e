import { getCurrentEnvironment } from '@src/features/environment';
import {
  mutateEntityHook,
  MutateEvent,
  mutatePlaceableHook,
} from '@src/foundry/hook-setups';
import { localize } from '@src/foundry/localization';
import { gameSettings, overlay } from '@src/init';
import { customElement, html, internalProperty, LitElement } from 'lit-element';
import { render } from 'lit-html';
import { openDialog } from '@src/open-dialog';
import styles from './scene-view.scss';
import { renderAutoForm, renderSubmitForm } from '@src/components/form/forms';
import {
  advanceWorldTime,
  CommonInterval,
  currentWorldTimeMS,
} from '@src/features/time';
import { renderTimeField } from '@src/components/field/fields';

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
    openDialog((dialog) => {
      dialog.style.setProperty('--mdc-dialog-min-width', '600px');
      return render(
        html`<environment-forms></environment-forms>
          <mwc-button
            slot="primaryAction"
            dialogAction="close"
            label=${localize('close')}
          ></mwc-button> `,
        dialog,
      );
    });
    // openDialog({
    //   $content: (dialog) => {
    //     dialog.style.setProperty('--dialog-width:', '600px');
    //     dialog.style.zIndex = '50';
    //     dialog.slot = 'foundry-apps';
    //     return render(html`<environment-forms></environment-forms>`, dialog);
    //   },
    //   center: true,
    //   $container: overlay,
    // });
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
