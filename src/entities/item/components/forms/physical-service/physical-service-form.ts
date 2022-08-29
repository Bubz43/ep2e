import {
  renderNumberField,
  renderRadioFields,
  renderSelectField,
  renderTextField,
  renderTimeField,
} from '@src/components/field/fields';
import {
  renderAutoForm,
  renderSubmitForm,
  renderUpdaterForm,
} from '@src/components/form/forms';
import { enumValues, PhysicalServiceType } from '@src/data-enums';
import { entityFormCommonStyles } from '@src/entities/components/form-layout/entity-form-common-styles';
import type { PhysicalService } from '@src/entities/item/proxies/physical-service';
import { addUpdateRemoveFeature, idProp } from '@src/features/feature-helpers';
import {
  createRep,
  Favor,
  maxFavors,
  RepNetwork,
  repRefreshTimerActive,
} from '@src/features/reputations';
import { CommonInterval, currentWorldTimeMS } from '@src/features/time';
import { localize } from '@src/foundry/localization';
import { customElement, html, property, state } from 'lit-element';
import { repeat } from 'lit-html/directives/repeat';
import { range } from 'remeda';
import { complexityForm, renderComplexityFields } from '../common-gear-fields';
import { ItemFormBase } from '../item-form-base';
import styles from './physical-service-form.scss';

enum RepCreatorMode {
  Common = 'common',
  Custom = 'custom',
}

@customElement('physical-service-form')
export class PhysicalServiceForm extends ItemFormBase {
  static get is() {
    return 'physical-service-form' as const;
  }

  static styles = [entityFormCommonStyles, complexityForm.styles, styles];

  @property({ attribute: false }) item!: PhysicalService;

  @state() private repCreatorMode = RepCreatorMode.Common;

  private readonly repOps = addUpdateRemoveFeature(
    () => this.item.updater.path('system', 'reputations').commit,
  );

  render() {
    const { updater, type, isFakeEgoId } = this.item;
    const { disabled } = this;
    return html`
      <entity-form-layout noSidebar>
        <entity-form-header
          noDefaultImg
          slot="header"
          .updateActions=${updater.path('')}
          type=${localize(type)}
          ?disabled=${disabled}
        >
        </entity-form-header>

        <div slot="details">
          <section>
            <sl-header heading=${localize('details')}></sl-header>
            <div class="detail-forms">
              ${renderUpdaterForm(updater.path('system'), {
                disabled,
                classes: 'primary-fields-form',
                fields: ({ serviceType, serviceDuration: duration }) => [
                  renderSelectField(
                    serviceType,
                    enumValues(PhysicalServiceType),
                  ),
                  renderTimeField(duration, {
                    min: CommonInterval.Turn,
                    permanentLabel: localize('indefinite'),
                  }),
                ],
              })}
              ${renderUpdaterForm(updater.path('system'), {
                disabled,
                classes: complexityForm.cssClass,
                fields: renderComplexityFields,
              })}
            </div>
          </section>

          ${isFakeEgoId ? this.renderReps() : ''}
        </div>

        <editor-wrapper
          slot="description"
          ?disabled=${disabled}
          .updateActions=${updater.path('system', 'description')}
        ></editor-wrapper>
        ${this.renderDrawerContent()}
      </entity-form-layout>
    `;
  }

  private renderReps() {
    const { reputations } = this.item;
    const { disabled } = this;
    return html`
      <section>
        <sl-header
          heading=${localize('reputations')}
          ?hideBorder=${reputations.length === 0}
        >
          <mwc-icon-button
            icon="add"
            slot="action"
            ?disabled=${disabled}
            @click=${this.setDrawerFromEvent(this.renderRepCreator)}
          ></mwc-icon-button>
        </sl-header>

        <sl-animated-list class="rep-list">
          ${repeat(reputations, idProp, (rep) => {
            return html`
              <li class="rep">
                <div class="rep-main">
                  <span class="rep-name"
                    >${rep.network}
                    <span class="network-abbreviation"
                      >(${rep.acronym})</span
                    ></span
                  >
                  <sl-popover
                    .renderOnDemand=${() =>
                      html`<sl-popover-section>
                        ${renderSubmitForm({
                          props: rep,
                          update: this.repOps.update,
                          fields: ({ acronym, network }) => [
                            renderTextField(network, {
                              required: true,
                              placeholder: localize('FULL', RepNetwork.Civic),
                            }),
                            renderTextField(acronym, {
                              required: true,
                              placeholder: localize(RepNetwork.Civic),
                              maxLength: 6,
                            }),
                          ],
                        })}
                      </sl-popover-section>`}
                  >
                    <mwc-icon-button
                      icon="edit"
                      slot="base"
                      ?disabled=${disabled}
                    ></mwc-icon-button>
                  </sl-popover>

                  <delete-button
                    ?disabled=${disabled}
                    @delete=${this.repOps.removeCallback(rep.id)}
                  ></delete-button>
                </div>

                <div class="favors">
                  ${[...maxFavors].map(([favor, max]) => {
                    const usedAmount = rep[favor];
                    return html`
                      <span title=${localize(favor)}>
                        <span class="favor-label">${localize(favor)}</span>
                        ${range(1, max + 1).map((favorNumber) => {
                          const used = usedAmount >= favorNumber;
                          return html`
                            <mwc-icon-button
                              @click=${() => {
                                const isActive =
                                  repRefreshTimerActive(rep) &&
                                  rep.refreshStartTime !== 0;
                                const setRefresh =
                                  favor === Favor.Major ? false : !isActive;
                                return this.repOps.update(
                                  {
                                    [favor]: used
                                      ? favorNumber === 1
                                        ? 0
                                        : favorNumber === 2
                                        ? 1
                                        : 2
                                      : favorNumber,
                                    refreshStartTime: setRefresh
                                      ? currentWorldTimeMS()
                                      : undefined,
                                  },
                                  { id: rep.id },
                                );
                              }}
                              ?disabled=${this.disabled}
                              icon=${used
                                ? 'check_box'
                                : 'check_box_outline_blank'}
                            ></mwc-icon-button>
                          `;
                        })}
                      </span>
                    `;
                  })}
                </div>
                ${renderAutoForm({
                  classes: 'score-form',
                  props: rep,
                  update: this.repOps.update,
                  disabled,
                  fields: ({ score }) =>
                    renderNumberField(score, { min: -99, max: 99 }),
                })}
              </li>
            `;
          })}
        </sl-animated-list>
      </section>
    `;
  }

  private renderRepCreator() {
    const { repCreatorMode } = this;
    return html`
      <h3>${localize('add')} ${localize('rep')}</h3>

      ${renderAutoForm({
        props: { mode: repCreatorMode },
        update: ({ mode }) => mode && (this.repCreatorMode = mode),
        fields: ({ mode }) =>
          renderRadioFields(mode, enumValues(RepCreatorMode)),
      })}
      ${repCreatorMode === RepCreatorMode.Common
        ? renderSubmitForm({
            submitEmpty: true,
            props: { rep: RepNetwork.Anarchist, score: 10 },
            update: ({ rep = RepNetwork.Anarchist, score = 10 }) => {
              this.repOps.add(
                {},
                createRep({
                  acronym: localize(rep),
                  network: localize('FULL', rep),
                  score,
                }),
              );
            },
            fields: ({ rep, score }) => [
              renderSelectField(rep, enumValues(RepNetwork)),
              renderNumberField(score, { min: -99, max: 99 }),
            ],
          })
        : renderSubmitForm({
            props: createRep({ acronym: '', network: '' }),
            update: this.repOps.add,
            fields: ({ score, acronym, network }) => [
              renderTextField(network, {
                required: true,
                placeholder: localize('FULL', RepNetwork.Civic),
              }),
              renderTextField(acronym, {
                required: true,
                placeholder: localize(RepNetwork.Civic),
                maxLength: 6,
              }),
              ,
              renderNumberField(score, { min: -99, max: 99 }),
            ],
          })}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'physical-service-form': PhysicalServiceForm;
  }
}
