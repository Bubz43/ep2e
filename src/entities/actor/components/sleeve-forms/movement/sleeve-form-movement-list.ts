import { renderSubmitForm } from '@src/components/form/forms';
import type { AppliedEffects } from '@src/entities/applied-effects';
import { renderMovementRateFields } from '@src/features/components/movement-rate-fields';
import { Source, SourcedEffect } from '@src/features/effects';
import {
  AddUpdateRemoveFeature,
  idProp,
  StringID,
} from '@src/features/feature-helpers';
import type { MovementRate } from '@src/features/movement';
import { localize } from '@src/foundry/localization';
import { tooltip } from '@src/init';
import { openMenu } from '@src/open-menu';
import { notEmpty, withSign } from '@src/utility/helpers';
import { customElement, LitElement, property, html } from 'lit-element';
import { repeat } from 'lit-html/directives/repeat';
import styles from './sleeve-form-movement-list.scss';

@customElement('sleeve-form-movement-list')
export class SleeveFormMovementList extends LitElement {
  static get is() {
    return 'sleeve-form-movement-list' as const;
  }

  static styles = [styles];

  @property({ attribute: false }) movementRates!: StringID<MovementRate>[];

  @property({ attribute: false }) operations!: AddUpdateRemoveFeature<
    StringID<MovementRate>
  >;

  @property({ attribute: false }) effects!: AppliedEffects['movementEffects'];

  @property({ type: Boolean }) disabled = false;

  render() {
    const { granted } = this.effects;
    const hasGranted = notEmpty(granted);
    return html`
      <sl-animated-list class="movement-list" skipExitAnimation>
        ${hasGranted ? html`<li class="label">${localize('innate')}:</li>` : ''}
        ${repeat(this.movementRates, idProp, this.renderInnateMovement)}
      </sl-animated-list>
      ${hasGranted
        ? html`
            <sl-animated-list class="movement-list" skipExitAnimation>
              <li class="label">${localize('upgrades')}:</li>
              ${granted.map(this.renderGrantedMovement)}
            </sl-animated-list>
          `
        : ''}
    `;
  }

  private renderInnateMovement = (
    movement: StringID<MovementRate>,
    index: number,
  ) => {
    const { baseModification, fullModification } =
      this.effects.modify.get(movement.type) ?? {};
    const showComma = index < this.movementRates.length - 1;
    return html`<li class="movement-rate">
      <sl-popover
        .renderOnDemand=${() => html`
          <sl-popover-section
            heading="${localize('edit')} ${localize('movement')}"
          >
            <delete-button
              slot="action"
              @delete=${this.operations.removeCallback(movement.id)}
            ></delete-button>
            ${renderSubmitForm({
              props: movement,
              update: this.operations.update,
              fields: renderMovementRateFields,
            })}
          </sl-popover-section>
        `}
      >
        <button
          slot="base"
          ?disabled=${this.disabled}
          @contextmenu=${(ev: MouseEvent) => {
            openMenu({
              content: [
                {
                  label: localize('delete'),
                  icon: html`<mwc-icon>delete_forever</mwc-icon>`,
                  callback: this.operations.removeCallback(movement.id),
                },
              ],
              position: ev,
            });
          }}
        >
          ${localize(movement.type)}
          ${movement.base}${baseModification
            ? html`<sup>(${withSign(baseModification)})</sup>`
            : ''}
          /
          ${movement.full}${fullModification
            ? html`<sup>(${withSign(fullModification)})</sup>`
            : ''}${showComma ? html`<span data-comma></span>` : ''}
        </button></sl-popover
      >
    </li>`;
  };

  private renderGrantedMovement = (
    movement: SourcedEffect<MovementRate>,
    index: number,
  ) => {
    const { baseModification, fullModification } =
      this.effects.modify.get(movement.type) ?? {};
    const showComma = index < this.effects.granted.length - 1;
    return html`
      <li
        class="movement-rate"
        data-ep-tooltip="${localize('source')}: ${movement[Source]}"
        @mouseover=${tooltip.fromData}
      >
        ${localize(movement.type)}
        ${movement.base}${baseModification
          ? html`<sup>(${withSign(baseModification)})</sup>`
          : ''}
        /
        ${movement.full}${fullModification
          ? html`<sup>(${withSign(fullModification)})</sup>`
          : ''}${showComma ? html`<span data-comma></span>` : ''}
      </li>
    `;
  };
}

declare global {
  interface HTMLElementTagNameMap {
    'sleeve-form-movement-list': SleeveFormMovementList;
  }
}
