import type { Damage } from '@src/combat/damages';
import {
  closeWindow,
  openWindow,
} from '@src/components/window/window-controls';
import type { ActorEP } from '@src/entities/actor/actor';
import { localize } from '@src/foundry/localization';
import { HealthType } from '@src/health/health';
import type { ActorHealth, Health } from '@src/health/health-mixin';
import {
  customElement,
  LitElement,
  property,
  html,
  PropertyValues,
  internalProperty,
} from 'lit-element';
import styles from './health-picker.scss';

@customElement('health-picker')
export class HealthPicker extends LitElement {
  static get is() {
    return 'health-picker' as const;
  }

  static styles = [styles];

  static openWindow(actor: ActorEP) {
    return openWindow({
      key: HealthPicker,
      name: `${localize('health')} ${localize('picker')}`,
      content: html` <health-picker .actor=${actor}></health-picker> `,
    });
  }

  @property({ attribute: false }) actor!: ActorEP;

  @property({ type: Object }) damage?: Damage;

  @internalProperty() private options: {
    type: HealthType;
    mode: 'heal' | 'harm';
  } = {
    type: HealthType.Physical,
    mode: 'heal',
  };

  private actorUnsub: (() => void) | null = null;

  private getHealth: ((actor: ActorEP) => ActorHealth | null) | null = null;

  disconnectedCallback() {
    this.cleanupSub();
    this.getHealth = null;
    super.disconnectedCallback();
  }

  update(changedProps: PropertyValues) {
    if (changedProps.has('actor')) {
      this.cleanupSub();
      this.actor.subscriptions.subscribe(this, {
        onEntityUpdate: () => this.requestUpdate(),
        onSubEnd: () => closeWindow(HealthPicker),
      });
    }
    super.update(changedProps);
  }

  private cleanupSub() {
    this.actorUnsub?.();
    this.actorUnsub = null;
  }

  render() {
    const health = this.getHealth?.(this.actor);
    return html`
      ${health ? html` <health-item .health=${health}></health-item> ` : ''}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'health-picker': HealthPicker;
  }
}
