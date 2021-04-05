import { createMessage, MessageVisibility } from '@src/chat/create-message';
import { PoolType } from '@src/data-enums';
import { ActorType } from '@src/entities/entity-types';
import type { Sleight } from '@src/entities/item/proxies/sleight';
import { prettyMilliseconds } from '@src/features/time';
import { localize } from '@src/foundry/localization';
import { rollLabeledFormulas } from '@src/foundry/rolls';
import { HealthType } from '@src/health/health';
import { openMenu } from '@src/open-menu';
import { InfectionTestControls } from '@src/success-test/components/infection-test-controls/infection-test-controls';
import { customElement, html, property, TemplateResult } from 'lit-element';
import { compact } from 'remeda';
import { requestCharacter } from '../../../character-request-event';
import { ItemCardBase } from '../item-card-base';
import styles from './sleight-card.scss';

@customElement('sleight-card')
export class SleightCard extends ItemCardBase {
  static get is() {
    return 'sleight-card' as const;
  }

  static get styles() {
    return [...super.styles, styles];
  }

  @property({ attribute: false }) item!: Sleight;

  connectedCallback() {
    Hooks.on('updateWorldTime', this._updateFromWorldTime);
    super.connectedCallback();
  }

  disconnectedCallback() {
    Hooks.off('updateWorldTime', this._updateFromWorldTime);
    super.disconnectedCallback();
  }

  private _updateFromWorldTime = () => this.requestUpdate();

  get isEnhanced() {
    return this.item.isChi && !!this.character.psi?.hasChiIncreasedEffect;
  }

  get willpower() {
    return this.character.ego.aptitudes.wil;
  }

  get poolType() {
    return this.character.ego.useThreat ? PoolType.Threat : PoolType.Moxie;
  }

  private startChiPushInfectionTest() {
    const { token } = requestCharacter(this);
    InfectionTestControls.openWindow({
      entities: { actor: this.character.actor, token },
      relativeEl: this,
      getState: (actor) => {
        if (actor.proxy.type === ActorType.Character && actor.proxy.psi) {
          return {
            character: actor.proxy,
            psi: actor.proxy.psi,
            modifier: { sleight: this.item.name, value: 5 },
          };
        }
        return null;
      },
    });
  }

  private async pushChiSleight(poolUse: 0 | 1 | 2) {
    const source = `${this.item.name} ${localize('push')} ${localize(
      'damage',
    )}`;
    if (!poolUse) {
      await createMessage({
        data: {
          header: {
            heading: source,
          },
          damage: {
            source,
            damageType: HealthType.Physical,
            rolledFormulas: rollLabeledFormulas([
              {
                label: ` ${localize('push')} ${localize('damage')}`,
                formula: '1d6',
              },
            ]),
          },
        },
        entity: this.character,
        visibility: MessageVisibility.WhisperGM,
      });
    }

    await this.item.psiPush(this.willpower);
    if (poolUse) {
      await this.character.addToSpentPools({
        pool: this.poolType,
        points: poolUse,
      });
    }

    if (this.character.psi?.hasVariableInfection && poolUse !== 2) {
      this.startChiPushInfectionTest();
    }
  }

  private openPushMenu() {
    const { poolType } = this;
    const availableMoxie = this.character.pools.get(poolType)?.available || 0;
    openMenu({
      header: { heading: `${localize('push')} ${this.item.name}` },
      content: compact([
        {
          label: `${localize('push')}, ${localize(
            'SHORT',
            'damageValue',
          )} 1d6, ${localize('infectionTest')}`,
          callback: () => this.pushChiSleight(0),
        },
        {
          label: `[1 ${localize(poolType)}] ${localize('push')}, ${localize(
            'infectionTest',
          )} & ${localize('negate')} ${localize('damage')}`,
          callback: () => this.pushChiSleight(1),
          disabled: availableMoxie < 1,
        },
        this.character.psi?.hasVariableInfection && {
          label: `[2 ${localize(poolType)}] ${localize('push')} & ${localize(
            'negate',
          )} ${localize('damage')} & ${localize('test')}`,
          callback: () => this.pushChiSleight(2),
          disabled: availableMoxie < 2,
        },
      ]),
    });
  }

  private openEndPushMenu() {
    openMenu({
      content: [
        {
          label: `${localize('end')} ${localize('push')}`,
          callback: () => this.item.endPush(),
        },
      ],
    });
  }

  renderHeaderButtons(): TemplateResult {
    if (this.item.isChi) {
      return this.isEnhanced
        ? html`<colored-tag type="info"> ${localize('enhanced')}</colored-tag>`
        : this.item.isPushed
        ? html`<colored-tag
            type="usable"
            @click=${this.openEndPushMenu}
            ?disabled=${this.character.disabled}
            clickable
            >${localize(this.item.pushTimer.remaining ? 'pushed' : 'push')}
            ${prettyMilliseconds(this.item.pushTimer.remaining, {
              approx: true,
              whenZero: localize('expired'),
            })}
          </colored-tag>`
        : html`<mwc-button
            @click=${this.openPushMenu}
            ?disabled=${this.character.disabled}
            dense
            class="push-button"
            >${localize('push')}</mwc-button
          >`;
    }
    return html``;
  }
  renderExpandedContent(): TemplateResult {
    return html``;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'sleight-card': SleightCard;
  }
}
