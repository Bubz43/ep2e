import { renderLabeledCheckbox, renderSlider } from '@src/components/field/fields';
import { renderAutoForm } from '@src/components/form/forms';
import { UseWorldTime } from '@src/components/mixins/world-time-mixin';
import type { PhysicalTech } from '@src/entities/item/proxies/physical-tech';
import { Substance } from '@src/entities/item/proxies/substance';
import { currentWorldTimeMS, prettyMilliseconds } from '@src/features/time';
import { localize } from '@src/foundry/localization';
import { tooltip } from '@src/init';
import { openMenu } from '@src/open-menu';
import { localImage } from '@src/utility/images';
import {
  customElement,
  LitElement,
  property,
  html,
  internalProperty,
  PropertyValues,
} from 'lit-element';
import styles from './item-card-fabber.scss';

@customElement('item-card-fabber')
export class ItemCardFabber extends UseWorldTime(LitElement) {
  static get is() {
    return 'item-card-fabber' as const;
  }

  static styles = [styles];

  @property({ attribute: false }) fabber!: PhysicalTech;

  @internalProperty() private editing = false;

  @internalProperty() private prog = 0;

  update(changedProps: PropertyValues) {
    if (this.editing && changedProps.get('fabber') !== undefined) {
      this.prog = this.fabber.printState.progress;
    }
    super.update(changedProps);
  }

  private toggleEditing() {
    this.editing = !this.editing;
    if (this.editing) this.prog = this.fabber.printState.progress;
    else this.applyProgress();
  }

  private discardChanges() {
    this.editing = false;
  }

  private applyProgress() {
    this.fabber.updater
      .prop('data', 'state', 'fabStartTime')
      .commit(
        currentWorldTimeMS() -
          this.fabber.printState.duration * (this.prog / 100),
      );
  }

  private async useGlandedSubstance(ev: MouseEvent) {
    const { glandedSubstance: item } = this.fabber;
    if (!item) return
    if (item.applicationMethods.length === 1) {
      await item.createMessage({ method: item.applicationMethods[0]! });
      this.fabber.printState.updateStartTime(currentWorldTimeMS())
      }
    
      else {
        let isHidden = false;
        openMenu({
          header: { heading: `${localize('use')} ${item.name}` },
          content: [
            renderAutoForm({
              props: { hidden: isHidden },
              update: ({ hidden = false }) => (isHidden = hidden),
              fields: ({ hidden }) => renderLabeledCheckbox(hidden),
            }),
            'divider',
            ...item.applicationMethods.map((method) => ({
              label: `${localize(method)} - ${localize(
                'onset',
              )}: ${prettyMilliseconds(Substance.onsetTime(method))}`,
              callback: async () => {
                await  item.createMessage({ method, hidden: isHidden });
                this.fabber.printState.updateStartTime(currentWorldTimeMS())

              },
            })),
          ],
          position: ev,
        });
      }
  }

  render() {
    const {
      fabricatedItem,
      printState,
      editable,
    } = this.fabber;

    return html`
      ${fabricatedItem?.nonDefaultImg
        ? html` <img height="20px" src=${fabricatedItem.nonDefaultImg} /> `
        : ''}
      <span class="name"
        >${fabricatedItem
          ? html`${fabricatedItem.name}
              <span class="nested-type">${fabricatedItem.fullType}</span>`
          : `--${localize('available')}--`}</span
      >

      ${fabricatedItem
        ? html`
            <div class="actions">
              <button @click=${this.toggleEditing}>
                <mwc-icon>${this.editing ? 'save' : 'edit'}</mwc-icon>
              </button>
              ${this.editing
                ? html`<button @click=${this.discardChanges}>
                    <mwc-icon>clear</mwc-icon>
                  </button>`
                : html`
                    ${!printState.remaining && this.fabber.glandedSubstance
                      ? html`
                          <mwc-icon-button
                            @click=${this.useGlandedSubstance}
                            ?disabled=${!editable}
                            data-tooltip=${localize('use')}
                            @mouseover=${tooltip.fromData}
                            ><img
                              src=${localImage('icons/actions/pill-drop.svg')}
                            />
                          </mwc-icon-button>
                        `
                      : ''}
                  `}
            </div>
            ${this.editing
              ? this.renderProgressForm()
              : html`
                  <mwc-linear-progress
                    progress=${printState.progress / 100}
                  ></mwc-linear-progress>
                `}
          `
        : ''}
    `;
  }

  private renderProgressForm() {
    return renderAutoForm({
      props: { progress: this.prog },
      update: ({ progress = 0 }) => (this.prog = progress),
      fields: ({ progress }) =>
        renderSlider(progress, {
          min: 0,
          max: 100,
          step: 1,
          pin: true,
        }),
    });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'item-card-fabber': ItemCardFabber;
  }
}
