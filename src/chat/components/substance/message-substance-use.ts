import type { SubstanceUseData } from '@src/chat/message-data';
import { substanceActivationDialog } from '@src/entities/actor/components/character-views/components/substance-activation-dialog';
import type { Character } from '@src/entities/actor/proxies/character';
import { ActorType } from '@src/entities/entity-types';
import { pickOrDefaultActor } from '@src/entities/find-entities';
import { Substance } from '@src/entities/item/proxies/substance';
import { matchID } from '@src/features/feature-helpers';
import { localize } from '@src/foundry/localization';
import { EP } from '@src/foundry/system';
import { RenderDialogEvent } from '@src/open-dialog';
import { notEmpty } from '@src/utility/helpers';
import { customElement, html, property } from 'lit-element';
import { pipe } from 'remeda';
import { MessageElement } from '../message-element';
import styles from './message-substance-use.scss';

@customElement('message-substance-use')
export class MessageSubstanceUse extends MessageElement {
  static get is() {
    return 'message-substance-use' as const;
  }

  static styles = [styles];

  @property({ type: Object }) substanceUse!: SubstanceUseData;

  get substance() {
    return new Substance({
      loaded: false,
      embedded: null,
      data: this.substanceUse.substance,
    });
  }

  get setData() {
    return this.getUpdater('substanceUse').commit;
  }

  private openSubstanceActivationDialog(character: Character, id: string) {
    const substance = character.awaitingOnsetSubstances.find(matchID(id));
    if (!substance) return;
    if (
      notEmpty(
        Object.values(character.appliedEffects.substanceModifiers).flat(),
      )
    ) {
      this.dispatchEvent(
        new RenderDialogEvent(substanceActivationDialog(character, substance)),
      );
    } else substance.makeActive([]);
  }

  applySubstance() {
    pickOrDefaultActor(async (actor) => {
      if (actor.proxy.type === ActorType.Character) {
        const { appliedTo, useMethod, hidden } = this.substanceUse;
        this.setData({
          appliedTo: [...(appliedTo || []), actor.tokenOrLocalInfo.name],
        });

        const [id] = await actor.itemOperations.add(
          this.substance.createAwaitingOnset({
            method: useMethod,
            hidden: hidden,
          }),
        );

        setTimeout(() => {
          if (
            Substance.onsetTime(useMethod) === 0 &&
            id &&
            actor.proxy.type === ActorType.Character
          ) {
            this.openSubstanceActivationDialog(actor.proxy, id);
          }
        }, 1);
      }
    }, true);
  }

  private removeAppliedTo(ev: Event) {
    if (this.disabled || !this.substanceUse.appliedTo) return;
    const index = Number((ev.currentTarget as HTMLElement).dataset['index']);
    const newList = [...this.substanceUse.appliedTo];
    newList.splice(index, 1);
    this.getUpdater('substanceUse').commit({ appliedTo: newList });
  }

  render() {
    const { useMethod, doses, appliedTo } = this.substanceUse;
    return html`
      <mwc-button @click=${this.applySubstance} dense unelevated
        >${localize('apply')} ${this.substance.partialType}</mwc-button
      >
      <div class="groups">
        ${useMethod !== 'use'
          ? html`
              <sl-group label=${localize('applicationMethod')}>
                ${localize(this.substanceUse.useMethod)}</sl-group
              >
            `
          : ''}
        ${doses
          ? html` <sl-group label=${localize('doses')}>${doses}</sl-group> `
          : ''}
        ${notEmpty(appliedTo) ? this.renderAppliedTo(appliedTo) : ''}
      </div>
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
    'message-substance-use': MessageSubstanceUse;
  }
}
