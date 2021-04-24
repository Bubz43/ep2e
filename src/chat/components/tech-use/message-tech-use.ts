import type { TechUse } from '@src/chat/message-data';
import { ActorType, ItemType } from '@src/entities/entity-types';
import { pickOrDefaultCharacter } from '@src/entities/find-entities';
import { addFeature } from '@src/features/feature-helpers';
import { createTemporaryFeature } from '@src/features/temporary';
import { localize } from '@src/foundry/localization';
import { AptitudeCheckControls } from '@src/success-test/components/aptitude-check-controls/aptitude-check-controls';
import { customElement, html, property } from 'lit-element';
import { MessageElement } from '../message-element';
import styles from './message-tech-use.scss';

@customElement('message-tech-use')
export class MessageTechUse extends MessageElement {
  static get is() {
    return 'message-tech-use' as const;
  }

  static get styles() {
    return [styles];
  }

  @property({ type: Object }) techUse!: TechUse;

  private startDefense() {
    const { resistCheck } = this.techUse;
    if (!resistCheck) return;
    pickOrDefaultCharacter((character) => {
      AptitudeCheckControls.openWindow({
        entities: { actor: character.actor },

        getState: (actor) => {
          if (actor.proxy.type !== ActorType.Character) return null;
          return {
            ego: actor.proxy.ego,
            character: actor.proxy,
            aptitude: resistCheck,
          };
        },
      });
    });
  }

  private applyEffects() {
    const { effects, duration, tech, appliedTo } = this.techUse;
    pickOrDefaultCharacter(async (character) => {
      await character.updater.path('data', 'temporary').commit(
        addFeature(
          createTemporaryFeature.effects({
            duration,
            effects,
            name: tech.name,
          }),
        ),
      );

      this.getUpdater('techUse').commit({
        appliedTo: (appliedTo || []).concat(character.name),
      });
    });
  }

  private setUsed() {
    const { actor } = this.message;
    const item = actor?.items?.get(this.techUse.tech.id)?.proxy;
    if (item?.type === ItemType.PhysicalTech && item.isSingleUse) {
      item.setSingleUseSpent(true);
    }
    this.getUpdater('techUse').commit({ actionTaken: 'spent' });
  }

  private deleteUsedTech() {
    this.message.actor?.itemOperations.remove(this.techUse.tech.id);
    this.getUpdater('techUse').commit({ actionTaken: 'deleted' });
  }

  private removeAppliedTo(ev: Event) {
    if (this.disabled || !this.techUse.appliedTo) return;
    const index = Number((ev.currentTarget as HTMLElement).dataset['index']);
    const newList = [...this.techUse.appliedTo];
    newList.splice(index, 1);
    this.getUpdater('techUse').commit({ appliedTo: newList });
  }

  render() {
    const { resistCheck, appliedTo, tech, actionTaken } = this.techUse;
    return html`
      ${resistCheck
        ? html`
            <sl-group label="${localize('resist')} ${localize('with')}"
              ><mwc-button dense class="resist" @click=${this.startDefense}
                >${localize(resistCheck)}</mwc-button
              ></sl-group
            >
          `
        : ''}
      <mwc-button @click=${this.applyEffects} class="apply"
        >${localize('applyEffects')}</mwc-button
      >
      ${appliedTo?.length ? this.renderAppliedTo(appliedTo) : ''}
      ${!tech.singleUse || this.disabled
        ? ''
        : actionTaken
        ? html`
            <p class="action-taken">${tech.name} ${localize(actionTaken)}</p>
          `
        : html`
            <div class="item-action">
              <mwc-button @click=${this.setUsed}
                >${localize('set')} ${localize('used')}</mwc-button
              >
              <delete-button @delete=${this.deleteUsedTech}></delete-button>
            </div>
          `}
    `;
  }

  private renderAppliedTo(names: string[]) {
    const { disabled } = this;
    return html`
      <sl-group label="${localize('applied')} ${localize('to')}"
        >${names.map(
          (name, index, list) => html`
            <wl-list-item
              class="applied-to"
              ?clickable=${!disabled}
              data-index=${index}
              @click=${this.removeAppliedTo}
            >
              ${name}${index < list.length - 1 ? ',' : ''}
              ${disabled ? '' : html` <mwc-icon>clear</mwc-icon> `}
            </wl-list-item>
          `,
        )}</sl-group
      >
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'message-tech-use': MessageTechUse;
  }
}
