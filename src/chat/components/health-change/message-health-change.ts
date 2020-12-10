import type { HealthChangeMessageData } from '@src/chat/message-data';
import { localize } from '@src/foundry/localization';
import { HealthModificationMode, HealthType } from '@src/health/health';
import { gameSettings } from '@src/init';
import { customElement, property, html } from 'lit-element';
import { MessageElement } from '../message-element';
import styles from './message-health-change.scss';

const checkIcon = () =>
  html`<mwc-icon slot="meta">check_circle_outline</mwc-icon>`;

@customElement('message-health-change')
export class MessageHealthChange extends MessageElement {
  static get is() {
    return 'message-health-change' as const;
  }

  static styles = [styles];

  @property({ type: Object }) healthChange!: HealthChangeMessageData;

  private get labels(): [string, string] {
    return this.healthChange.healthType === HealthType.Mental
      ? [localize('stress'), localize('traumas')]
      : [localize('damage'), localize('wounds')];
  }

  private rollGlitchCheck() {
    // TODO
  }

  private startDisorientationCheck() {
    // TODO
  }

  private startAcuteStressCheck() {
    // TODO
  }

  private startKnockdownCheck() {
    // TODO
  }

  private startUnconsciousnessCheck() {
    // TODO
  }

  private startBleedingOutCheck() {
    // TODO
  }

  private formatChange() {
    const {
      mode,
      damage,
      wounds,
      healthType,
      stressType,
      source,
    } = this.healthChange;

    const [damageLabel, woundLabel] = this.labels;
    const values = html`<span slot="secondary"
      >${damage} ${damageLabel}, ${wounds} ${woundLabel}</span
    >`;
    switch (mode) {
      case HealthModificationMode.Edit:
        return html`${source} ${localize('setHealthTo')} ${values} `;

      case HealthModificationMode.Heal:
        return html`${source} ${localize('healed')} ${values}`;

      case HealthModificationMode.Inflict:
        return html`${source} ${localize('inflicted')} ${values}`;
    }
  }

  private formatDeath() {
    switch (this.healthChange.healthType) {
      case HealthType.Physical:
        return localize(
          'DESCRIPTIONS',
          this.healthChange.biological
            ? 'TheBodyDies'
            : 'DestroyedBeyondRepair',
        );
      case HealthType.Mental:
        return localize("DESCRIPTIONS", "PermanentEgoMeltdown")
      
      case HealthType.Mesh:
        return localize("DESCRIPTIONS", "PermanentlyCorrupted")
    }
  }

  render() {
    // TODO bleedout/crash
    return html`
      <mwc-list>
        <mwc-list-item noninteractive twoline
          >${this.formatChange()}</mwc-list-item
        >
        <li divider></li>

        ${this.healthChange.killing
          ? html` <mwc-list-item noninteractive>${this.formatDeath()}</mwc-list-item> `
          : this.healthChange.wounds
          ? html` ${this.renderWoundChecks()} `
          : ''}
      </mwc-list>
    `;
  }

  private renderWoundChecks() {
    const { wounds, healthType } = this.healthChange;
    switch (healthType) {
      case HealthType.Mesh:
        return gameSettings.glitchOnMeshWounds.current
          ? html`
              <mwc-list-item hasMeta @click=${this.rollGlitchCheck}>
                ${checkIcon()}
                <span>
                  ${localize('roll')} ${localize('glitch')} ${localize('check')}
                  ${wounds * 10}%</span
                ></mwc-list-item
              >
            `
          : '';
      case HealthType.Mental:
        return html`
          <mwc-list-item
            hasMeta
            @click=${wounds === 1
              ? this.startDisorientationCheck
              : this.startAcuteStressCheck}
          >
            ${checkIcon()}
            <span
              >${localize('wil')} ${localize('check')}
              ${localize('SHORT', 'versus')}
              ${localize(wounds === 1 ? 'disorientation' : 'acuteStress')}</span
            ></mwc-list-item
          >
        `;

      case HealthType.Physical:
        return html`
          <mwc-list-item
            hasMeta
            @click=${wounds === 1
              ? this.startKnockdownCheck
              : this.startUnconsciousnessCheck}
          >
            ${checkIcon()}
            <span>
              ${localize('som')} ${localize('check')}
              ${localize('SHORT', 'versus')}
              ${localize(wounds === 1 ? 'knockdown' : 'unconsciousness')}</span
            >
          </mwc-list-item>
        `;
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'message-health-change': MessageHealthChange;
  }
}
