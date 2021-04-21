import type { DropZone } from '@src/components/dropzone/dropzone';
import {
  renderFormulaField,
  renderLabeledCheckbox,
  renderNumberField,
  renderRadioFields,
  renderSelectField,
  renderTextareaField,
  renderTextField,
  renderTimeField,
} from '@src/components/field/fields';
import {
  renderAutoForm,
  renderSubmitForm,
  renderUpdaterForm,
} from '@src/components/form/forms';
import {
  closeWindow,
  openWindow,
} from '@src/components/window/window-controls';
import {
  ResizeOption,
  SlWindowEventName,
} from '@src/components/window/window-options';
import { enumValues, ExsurgentStrain } from '@src/data-enums';
import { entityFormCommonStyles } from '@src/entities/components/form-layout/entity-form-common-styles';
import { ItemType } from '@src/entities/entity-types';
import { renderItemForm } from '@src/entities/item/item-views';
import type { Psi } from '@src/entities/item/proxies/psi';
import type { EffectCreatedEvent } from '@src/features/components/effect-creator/effect-created-event';
import { formatEffect } from '@src/features/effects';
import {
  addFeature,
  idProp,
  removeFeature,
  StringID,
  updateFeature,
} from '@src/features/feature-helpers';
import { MotivationStance } from '@src/features/motivations';
import {
  createDefaultInfluence,
  createPsiInfluence,
  DamageInfluence,
  influenceInfo,
  InfluenceRoll,
  influenceSort,
  MotivationInfluence,
  PsiInfluenceType,
  UniqueInfluence,
} from '@src/features/psi-influence';
import { CommonInterval, EPTimeInterval } from '@src/features/time';
import {
  dragValue,
  DropType,
  handleDrop,
  itemDropToItemProxy,
  setDragDrop,
} from '@src/foundry/drag-and-drop';
import { localize } from '@src/foundry/localization';
import { openMenu } from '@src/open-menu';
import { notEmpty, safeMerge } from '@src/utility/helpers';
import { customElement, html, property, PropertyValues } from 'lit-element';
import { classMap } from 'lit-html/directives/class-map';
import { repeat } from 'lit-html/directives/repeat';
import { createPipe, sortBy } from 'remeda';
import { ItemFormBase } from '../item-form-base';
import styles from './psi-form.scss';

@customElement('psi-form')
export class PsiForm extends ItemFormBase {
  static get is() {
    return 'psi-form' as const;
  }

  static styles = [entityFormCommonStyles, styles];

  @property({ attribute: false }) item!: Psi;

  private traitSheetKeys = new Map<InfluenceRoll, {}>();

  private editingRoll: InfluenceRoll = 1;

  private expandedInfluences = new Map<InfluenceRoll, boolean>();

  async connectedCallback() {
    if (!this.disabled && this.item.influencesData?.length !== 6) {
      await this.item.setupDefaultInfluences();
    }
    super.connectedCallback();
  }

  disconnectedCallback() {
    this.traitSheetKeys.forEach(closeWindow);
    this.traitSheetKeys.clear();
    super.disconnectedCallback();
  }

  update(changedProps: PropertyValues<this>) {
    for (const [roll] of this.traitSheetKeys) {
      this.openItemSheet(roll);
    }
    if (
      this.drawerContentRenderer &&
      this.editingInfluence.type === PsiInfluenceType.Trait
    ) {
      this.drawerContentRenderer = null;
    }

    super.update(changedProps);
  }

  setExpandedState(roll: InfluenceRoll, state: boolean) {
    this.expandedInfluences.set(roll, state);
    this.requestUpdate();
  }

  get editingInfluence() {
    return this.item.fullInfluences[this.editingRoll];
  }

  private openItemSheet(roll: InfluenceRoll) {
    const influence = this.item.fullInfluences[roll];
    const { traitSheetKeys } = this;
    let key = traitSheetKeys.get(roll);
    const existed = !!key;
    if (!key) {
      key = {};
      traitSheetKeys.set(roll, key);
    }

    if (influence.type !== PsiInfluenceType.Trait) {
      closeWindow(key);
      traitSheetKeys.delete(roll);
      return;
    }

    const { wasConnected, win } = openWindow(
      {
        key: key,
        content: renderItemForm(influence.trait),
        adjacentEl: this,
        forceFocus: true,
        name: influence.trait.fullName,
      },
      { resizable: ResizeOption.Vertical, renderOnly: true },
    );
    if (!wasConnected) {
      win.addEventListener(
        SlWindowEventName.Closed,
        () => traitSheetKeys.delete(roll),
        { once: true },
      );
    }
  }

  private openTransformMenu(roll: InfluenceRoll) {
    const influence = this.item.fullInfluences[roll];
    openMenu({
      content: enumValues(PsiInfluenceType).map((type) => ({
        label: `${localize(type)} ${localize('influence')}`,
        callback: () => {
          this.item.influenceCommiter((influences) => {
            const removed = removeFeature(influences, influence.id);
            return addFeature(removed, createDefaultInfluence(roll, type));
          });
        },
        activated: influence.type === type,
      })),
    });
  }

  private editInfluence(roll: InfluenceRoll) {
    if (this.item.fullInfluences[roll].type === PsiInfluenceType.Trait) {
      this.openItemSheet(roll);
    } else {
      this.editingRoll = roll;
      this.setDrawer(this.influenceEditor);
    }
  }

  private handleDrop = handleDrop(async ({ ev, srcEl, data }) => {
    if (this.disabled) return;
    const target = ev.currentTarget as DropZone;
    const roll = Number(target.dataset['roll']) as InfluenceRoll;
    const targetInfluence = this.item.fullInfluences[roll];
    if (!targetInfluence || target.contains(srcEl ?? null)) return;
    if (data?.type === DropType.PsiInfluence) {
      const local = target.parentElement?.contains(srcEl ?? null);
      if (local) {
        const sourceInfluence = this.item.fullInfluences[data.influence.roll];
        this.item.influenceCommiter((influences) => {
          const updated = updateFeature(influences, {
            id: sourceInfluence.id,
            roll: targetInfluence.roll,
          });
          return updateFeature(updated, {
            id: targetInfluence.id,
            roll: sourceInfluence.roll,
          });
        });
      } else {
        this.item.influenceCommiter(
          createPipe(
            removeFeature(targetInfluence.id),
            addFeature({
              ...data.influence,
              roll: targetInfluence.roll,
            }),
          ),
        );
      }
    } else if (data?.type === DropType.Item) {
      const proxy = await itemDropToItemProxy(data);
      if (proxy?.type === ItemType.Trait) {
        this.item.influenceCommiter(
          createPipe(
            removeFeature(targetInfluence.id),
            addFeature(
              createPsiInfluence.trait({
                roll: targetInfluence.roll,
                trait: proxy.getDataCopy(),
              }),
            ),
          ),
        );
      }
    }
  });

  render() {
    const {
      updater,
      type,
      hasVariableInfection,
      name,
      fullInfluences,
      influencesData,
    } = this.item;
    const { disabled } = this;
    return html`
      <entity-form-layout noSidebar>
        <sl-animated-list slot="details">
          <section>
            <sl-header heading="${localize('psi')} ${localize('trait')}">
              ${renderUpdaterForm(updater.path('data'), {
                disabled,
                slot: 'action',
                fields: ({ requireBioSubstrate }) =>
                  renderLabeledCheckbox(requireBioSubstrate),
              })}
            </sl-header>
            <div class="detail-forms">
              ${this.strainOptions}
              ${renderUpdaterForm(updater.path('data'), {
                disabled,
                fields: ({ strain }) =>
                  renderTextField(strain, { listId: 'strains' }),
              })}
              ${renderAutoForm({
                props: { name },
                update: ({ name }) => {
                  this.item.updater.path('name').commit(name || this.item.name);
                  this.requestUpdate();
                },
                disabled,
                fields: ({ name }) =>
                  renderTextField({ ...name, label: localize('substrain') }),
              })}
              ${renderUpdaterForm(updater.path('data'), {
                disabled,
                fields: ({ level }) =>
                  renderNumberField(level, {
                    min: 1,
                    max: game.user.isGM ? 3 : 2,
                  }),
              })}
            </div>
            ${this.strainOptions}
          </section>

          ${influencesData
            ? repeat(sortBy(influencesData, influenceSort), idProp, (data) => {
                const { roll, type } = data;
                const fullInfluence = this.item.fullInfluences[roll];
                const { name, description } = influenceInfo(fullInfluence);
                const isDamage = type === PsiInfluenceType.Damage;
                const hideEnriched = isDamage || !description;
                const expanded =
                  !!this.expandedInfluences.get(roll) && !hideEnriched;
                return html`
                  <sl-dropzone
                    class="influence ${classMap({ expanded })}"
                    @drop=${this.handleDrop}
                    ?disabled=${disabled}
                    data-roll=${roll}
                  >
                    <span
                      class="roll"
                      draggable=${dragValue(!disabled)}
                      @dragstart=${(ev: DragEvent) => {
                        const el = ev.currentTarget as HTMLElement;
                        el.parentElement?.classList.add('dragged');
                        setDragDrop(ev, {
                          type: DropType.PsiInfluence,
                          influence: data,
                        });
                      }}
                      @dragend=${(ev: DragEvent) => {
                        const el = ev.currentTarget as HTMLElement;
                        el.parentElement?.classList.remove('dragged');
                      }}
                      >${roll}${roll === 6 ? '+' : ''}</span
                    >

                    <span class="name"
                      >${name}${isDamage
                        ? html`. <span class="formula">${description}</span>`
                        : ''}</span
                    >
                    ${expanded
                      ? html`
                          <p class="description">
                            <enriched-html
                              .content=${description}
                            ></enriched-html>
                          </p>
                        `
                      : ''}

                    <div class="actions">
                      ${hideEnriched
                        ? ''
                        : html`
                            <mwc-icon-button
                              icon=${expanded
                                ? 'keyboard_arrow_down'
                                : 'keyboard_arrow_left'}
                              @click=${() =>
                                this.setExpandedState(roll, !expanded)}
                            ></mwc-icon-button>
                          `}
                      <mwc-icon-button
                        icon="edit"
                        ?disabled=${disabled}
                        @click=${() => this.editInfluence(roll)}
                      ></mwc-icon-button>
                      <mwc-icon-button
                        icon="transform"
                        ?disabled=${disabled}
                        @click=${() => this.openTransformMenu(roll)}
                      ></mwc-icon-button>
                    </div>
                  </sl-dropzone>
                `;
              })
            : ''}
        </sl-animated-list>

        <editor-wrapper
          slot="description"
          ?disabled=${disabled}
          .updateActions=${updater.path('data', 'description')}
        ></editor-wrapper>
        ${this.renderDrawerContent()}
      </entity-form-layout>
    `;
  }

  private influenceEditor() {
    const influence = this.editingInfluence;
    switch (influence.type) {
      case PsiInfluenceType.Trait:
        return html``;
      case PsiInfluenceType.Damage:
        return this.editDamage(influence);
      case PsiInfluenceType.Motivation:
        return this.editMotivation(influence);
      case PsiInfluenceType.Unique:
        return this.editUnique(influence);
    }
  }

  private editDamage(influence: StringID<DamageInfluence>) {
    return html`
      <h3>${localize('edit')} ${localize(influence.type)}</h3>
      ${renderSubmitForm({
        props: influence,
        update: ({ formula = '1d6' }) => {
          this.item.influenceCommiter((influences) =>
            updateFeature(influences, { id: influence.id, formula }),
          );
        },
        fields: ({ formula }) =>
          renderFormulaField(formula, { required: true }),
      })}
    `;
  }

  private editMotivation(influence: StringID<MotivationInfluence>) {
    return html`
      <h3>${localize('edit')} ${localize(influence.type)}</h3>
      <div class="motivation-forms">
        ${renderAutoForm({
          props: influence.motivation,
          update: (changed, original) => {
            if ('cause' in changed && !changed.cause) return;
            this.item.influenceCommiter((influences) =>
              updateFeature(influences, {
                id: influence.id,
                motivation: safeMerge(original, changed),
              }),
            );
          },
          fields: ({ stance, cause }) => [
            renderRadioFields(stance, enumValues(MotivationStance)),
            renderTextField(cause, { required: true }),
          ],
        })}
        ${renderAutoForm({
          props: influence,
          update: ({ description = '' }) => {
            this.item.influenceCommiter((influences) =>
              updateFeature(influences, { id: influence.id, description }),
            );
          },
          fields: ({ description }) =>
            renderTextareaField(description, { rows: 20, resizable: true }),
        })}
      </div>
    `;
  }

  private editUnique(influence: StringID<UniqueInfluence>) {
    const { items, durationFormula, interval } = influence.effects;
    return html`
      <h3>${localize('edit')} ${localize(influence.type)}</h3>
      <div class="unique-influence-forms">
        ${renderAutoForm({
          props: influence,
          update: (changed, original) => {
            if ('name' in changed && !changed.name) return;
            this.item.influenceCommiter((influences) =>
              updateFeature(influences, safeMerge(original, changed)),
            );
          },
          fields: ({ name, duration, description }) => [
            renderTextField(name, { required: true }),
            renderTimeField(duration, { min: CommonInterval.Turn }),
            renderTextareaField(description, { resizable: true, rows: 12 }),
          ],
        })}
        <section>
          <sl-header heading=${localize('effects')}>
            <sl-popover
              slot="action"
              .renderOnDemand=${() =>
                html` <sl-popover-section
                  heading="${localize('add')} ${localize('effect')}"
                  ><effect-creator
                    @effect-created=${(ev: EffectCreatedEvent) =>
                      this.item.influenceCommiter((influences) =>
                        updateFeature(influences, {
                          id: influence.id,
                          effects: {
                            ...influence.effects,
                            items: addFeature(items, ev.effect),
                          },
                        }),
                      )}
                  ></effect-creator
                ></sl-popover-section>`}
            >
              <mwc-icon-button icon="add" slot="base"></mwc-icon-button
            ></sl-popover>
          </sl-header>
          ${notEmpty(items)
            ? html`
                <sl-animated-list>
                  ${repeat(
                    items,
                    idProp,
                    (effect) => html`<wl-list-item>
                      ${formatEffect(effect)}
                      <delete-button
                        slot="after"
                        @delete=${() =>
                          this.item.influenceCommiter((influences) =>
                            updateFeature(influences, {
                              id: influence.id,
                              effects: {
                                ...influence.effects,
                                items: removeFeature(items, effect.id),
                              },
                            }),
                          )}
                      ></delete-button>
                    </wl-list-item>`,
                  )}
                </sl-animated-list>

                ${renderAutoForm({
                  props: { durationFormula, interval },
                  update: (changed) => {
                    if (
                      'durationFormula' in changed &&
                      !changed.durationFormula
                    )
                      return;
                    this.item.influenceCommiter((influences) =>
                      updateFeature(influences, {
                        id: influence.id,
                        effects: {
                          ...influence.effects,
                          ...changed,
                        },
                      }),
                    );
                  },
                  fields: ({ durationFormula, interval }) => [
                    renderFormulaField(durationFormula, { required: true }),
                    renderSelectField(interval, enumValues(EPTimeInterval)),
                  ],
                })}
              `
            : ''}
        </section>
      </div>
    `;
  }

  private strainOptions = html`
    <datalist id="strains">
      ${enumValues(ExsurgentStrain).map(
        (strain) => html` <option value=${localize(strain)}></option> `,
      )}
    </datalist>
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    'psi-form': PsiForm;
  }
}
