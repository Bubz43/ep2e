import { renderLabeledCheckbox } from '@src/components/field/fields';
import { renderAutoForm } from '@src/components/form/forms';
import type { Character } from '@src/entities/actor/proxies/character';
import { ItemType } from '@src/entities/entity-types';
import {
  Substance,
  SubstanceUseMethod,
} from '@src/entities/item/proxies/substance';
import { idProp, matchID } from '@src/features/feature-helpers';
import { prettyMilliseconds } from '@src/features/time';
import {
  DropType,
  handleDrop,
  itemDropToItemProxy,
} from '@src/foundry/drag-and-drop';
import { localize } from '@src/foundry/localization';
import { tooltip } from '@src/init';
import { RenderDialogEvent } from '@src/open-dialog';
import { openMenu } from '@src/open-menu';
import { notEmpty } from '@src/utility/helpers';
import { customElement, html, LitElement, property } from 'lit-element';
import { repeat } from 'lit-html/directives/repeat';
import { substanceActivationDialog } from '../substance-activation-dialog';
import styles from './character-view-substances.scss';

@customElement('character-view-substances')
export class CharacterViewSubstances extends LitElement {
  static get is() {
    return 'character-view-substances' as const;
  }

  static get styles() {
    return [styles];
  }

  @property({ attribute: false }) character!: Character;

  protected applyDroppedSubstance = handleDrop(async ({ ev, data }) => {
    if (data?.type === DropType.Item && !this.character.disabled) {
      const item = await itemDropToItemProxy(data);
      if (item?.type !== ItemType.Substance || !item.quantity) return;
      let isHidden = false;

      const addSubstance = async (method: SubstanceUseMethod) => {
        const [id] = await this.character.itemOperations.add(
          item.createAwaitingOnset({ method }),
        );
        if (item.actor && item.editable) await item.use();

        await this.updateComplete;
        setTimeout(() => {
          if (Substance.onsetTime(method) === 0 && id) {
            this.openSubstanceActivationDialog(id);
          }
        }, 1);
      };
      if (
        item.applicationMethods.length === 1 &&
        this.character.hasItemProxy(item)
      ) {
        addSubstance(item.applicationMethods[0]!);
      } else {
        openMenu({
          header: { heading: `${localize('apply')} ${item.name}` },
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
              callback: () => addSubstance(method),
            })),
          ],
          position: ev,
        });
      }
    }
  });

  protected openSubstanceActivationDialog(id: string) {
    const substance = this.character.awaitingOnsetSubstances.find(matchID(id));
    console.log(substance);
    if (!substance) return;
    if (
      notEmpty(
        Object.values(this.character.appliedEffects.substanceModifiers).flat(),
      )
    ) {
      this.dispatchEvent(
        new RenderDialogEvent(
          substanceActivationDialog(this.character, substance),
        ),
      );
    } else substance.makeActive([]);
  }

  render() {
    const {
      awaitingOnsetSubstances,
      activeSubstances,
      disabled,
    } = this.character;
    return html` <character-view-drawer-heading
        >${localize('substances')}</character-view-drawer-heading
      >
      <sl-dropzone
        class="applied-substances"
        ?disabled=${this.character.disabled}
        @drop=${this.applyDroppedSubstance}
      >
        ${activeSubstances.length + awaitingOnsetSubstances.length === 0
          ? html`
              <p class="no-substances-message">
                ${localize('no')} ${localize('applied')}
                ${localize('substances')}.
              </p>
            `
          : html`
              ${notEmpty(activeSubstances)
                ? html`
                    <sl-details
                      open
                      summary="${localize('active')} ${localize(
                        'substances',
                      )} (${activeSubstances.length})"
                    >
                      <sl-animated-list class="active-substances">
                        ${repeat(
                          activeSubstances,
                          idProp,
                          (substance) => html`
                            <character-view-active-substance
                              .substance=${substance}
                              .character=${this.character}
                            ></character-view-active-substance>
                          `,
                        )}
                      </sl-animated-list>
                    </sl-details>
                  `
                : ''}
              ${notEmpty(awaitingOnsetSubstances)
                ? html`
                    <sl-details
                      open
                      summary="${localize(
                        'substancesAwaitingOnset',
                      )} (${awaitingOnsetSubstances.length})"
                    >
                      <sl-animated-list>
                        ${repeat(
                          awaitingOnsetSubstances,
                          idProp,
                          (substance) => html`
                            <time-state-item
                              ?disabled=${disabled}
                              .timeState=${substance.awaitingOnsetTimeState}
                              completion="ready"
                              .item=${substance}
                            >
                              <mwc-icon-button
                                slot="action"
                                icon="play_arrow"
                                data-tooltip=${localize('start')}
                                @mouseover=${tooltip.fromData}
                                @click=${() => {
                                  this.openSubstanceActivationDialog(
                                    substance.id,
                                  );
                                }}
                              ></mwc-icon-button>
                            </time-state-item>
                          `,
                        )}
                      </sl-animated-list></sl-details
                    >
                  `
                : ''}
            `}
      </sl-dropzone>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'character-view-substances': CharacterViewSubstances;
  }
}
