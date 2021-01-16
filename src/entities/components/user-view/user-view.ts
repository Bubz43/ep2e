import { UserEP } from '@src/entities/user';
import { mutateEntityHook, MutateEvent } from '@src/foundry/hook-setups';
import { customElement, LitElement, property, html } from 'lit-element';
import { classMap } from 'lit-html/directives/class-map';
import styles from './user-view.scss';

@customElement('user-view')
export class UserView extends LitElement {
  static get is() {
    return 'user-view' as const;
  }

  static get styles() {
    return [styles];
  }

  connectedCallback() {
    super.connectedCallback();
    mutateEntityHook({
      entity: UserEP,
      hook: 'on',
      event: MutateEvent.Update,
      callback: () => this.requestUpdate(),
    });
  }

  private get user() {
    return game.user;
  }

  private openPlayerConfig() {
    new PlayerConfig(this.user, {}).render(true);
  }

  private popoutImage() {
    const { avatar, name, uuid } = this.user;
    new ImagePopout(avatar, {
      title: name,
      shareable: false,
      uuid: uuid,
    }).render(true);
  }

  private viewMacros() {
    ui.macros.renderPopout();
  }

  render() {
    const { avatar, name, isGM, character } = this.user;
    const { color } = this.user.data;
    const showAvatar = avatar !== CONST.DEFAULT_TOKEN;
    return html`
      ${showAvatar
        ? html`
            <button>
              <img
                src=${avatar}
                height="32px"
                class="avatar"
                @click=${this.popoutImage}
              />
            </button>
          `
        : ''}
      <span class="name">${name} ${isGM ? '[GM]' : ''}</span>

      <div class="icons">
        <mwc-icon-button
          style="color: ${color}"
          icon="account_circle"
          @click=${this.openPlayerConfig}
        ></mwc-icon-button>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'user-view': UserView;
  }
}
