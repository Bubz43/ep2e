import {
  renderLabeledCheckbox,
  renderSelectField,
  renderTextField,
} from '@src/components/field/fields';
import type { Form } from '@src/components/form/form';
import { renderAutoForm } from '@src/components/form/forms';
import { Placement } from '@src/components/popover/popover-options';
import type { SubmitButton } from '@src/components/submit-button/submit-button';
import { closeWindow } from '@src/components/window/window-controls';
import { enumValues } from '@src/data-enums';
import { ActorType, sleeveTypes } from '@src/entities/entity-types';
import { createDefaultItem } from '@src/entities/item/default-items';
import type { SleeveType } from '@src/entities/models';
import { addFeature } from '@src/features/feature-helpers';
import { createFieldSkillData, FieldSkillType } from '@src/features/skills';
import { mutateEntityHook, MutateEvent } from '@src/foundry/hook-setups';
import { localize } from '@src/foundry/localization';
import { EP } from '@src/foundry/system';
import { clickIfEnter, notEmpty, safeMerge } from '@src/utility/helpers';
import {
  customElement,
  eventOptions,
  html,
  LitElement,
  property,
  PropertyValues,
  query,
  state,
} from 'lit-element';
import { createPipe, flatMapToObj } from 'remeda';
import { createActor } from '../../actor';
import { createDigimorph } from '../../default-actors';
import { ownedSleeves, Sleeve } from '../../sleeves';
import styles from './actor-creator.scss';

enum ActorKind {
  Character = 'character',
  Sleeve = 'sleeve',
}

enum CharacterTemplate {
  PC = 'playerCharacter',
  Muse = 'muse',
  Threat = 'threat',
}

@customElement('actor-creator')
export class ActorCreator extends LitElement {
  static get is() {
    return 'actor-creator' as const;
  }

  static styles = [styles];

  @property({ type: String }) folder?: string;

  @query('submit-button') private submitButton!: SubmitButton;

  @query('.main-form sl-form') private actorForm!: Form;

  @state() private actorKind = ActorKind.Character;

  @state() private characterTemplate = CharacterTemplate.PC;

  @state() private selectedSleeve: Sleeve | null = null;

  private defaultSleeveData = createDigimorph();

  private options = {
    renderSheet: true,
    closeOnCreate: true,
    actorLink: true,
  };

  private characterData = {
    name: '',
    template: CharacterTemplate.PC,
    folder: '',
  };

  private sleeveData: {
    name: string;
    type: SleeveType;
    folder: string;
  } = {
    name: '',
    type: ActorType.Biological,
    folder: '',
  };

  async connectedCallback() {
    super.connectedCallback();
    await this.updateComplete;
    this.focusFirstInput();
    this.toggleHooks('on');
  }

  disconnectedCallback() {
    this.toggleHooks('off');
    super.disconnectedCallback();
  }

  update(changedProps: PropertyValues<this>) {
    if (changedProps.has('folder')) {
      this.sleeveData.folder = this.folder || '';
      this.characterData.folder = this.folder || '';
    }
    super.update(changedProps);
  }

  updated(changedProps: PropertyValues<this>) {
    if (changedProps.has('folder')) this.focusFirstInput();
    super.updated(changedProps);
  }

  private updateFromHook = () => this.requestUpdate();

  private focusFirstInput() {
    requestAnimationFrame(() => {
      this.renderRoot.querySelector('sl-field')?.input?.focus();
    });
  }

  private get folders() {
    return flatMapToObj([...game.folders], ({ displayed, data }) =>
      data.type === 'Actor' && displayed ? [[data._id, data.name]] : [],
    );
  }

  private toggleHooks(hook: 'on' | 'off') {
    for (const event of [
      MutateEvent.Create,
      MutateEvent.Update,
      MutateEvent.Delete,
    ]) {
      mutateEntityHook({
        entity: Folder,
        hook,
        event,
        callback: this.updateFromHook,
      });
    }
  }

  @eventOptions({ capture: true })
  private clickSubmit(ev: KeyboardEvent) {
    if (ev.key === 'Enter' && ev.target instanceof HTMLInputElement) {
      this.submitButton?.click();
    }
  }

  private createActor(data: {
    type: ActorType;
    name?: string;
    folder?: string;
  }) {
    const { renderSheet, actorLink } = this.options;
    return createActor(
      {
        ...data,
        name: data.name || `${localize('new')} ${localize(data.type)}`,
        token: { actorLink },
      },
      { renderSheet },
    );
  }

  private updateOptions = (options: Partial<ActorCreator['options']>) => {
    this.options = safeMerge(this.options, options);
  };

  private updateCharacterData = (
    data: Partial<ActorCreator['characterData']>,
  ) => {
    this.characterData = safeMerge(this.characterData, data);
    this.requestUpdate();
  };

  private updateSleeveData = (data: Partial<ActorCreator['sleeveData']>) => {
    this.sleeveData = safeMerge(this.sleeveData, data);
    this.requestUpdate();
  };

  private async create() {
    if (this.actorKind === ActorKind.Character) {
      const { proxy } = await this.createActor({
        name: this.characterData.name,
        type: ActorType.Character,
        folder: this.characterData.folder,
      });
      if (proxy.type === ActorType.Character) {
        const { selectedSleeve } = this;
        const sleeveData = selectedSleeve?.dataCopy() || this.defaultSleeveData;
        const itemsToAdd = [...sleeveData.items];
        if (this.characterData.template === CharacterTemplate.Muse) {
          if (!selectedSleeve && sleeveData.type === ActorType.Infomorph) {
            sleeveData.system.acquisition.resource = '';
            sleeveData.system.meshHealth.baseDurability = 20;
            sleeveData.system.description = `<p>Default infomorph for ALIs.</p>`;
            sleeveData.name = `${localize('ali')} ${localize('morph')}`;
          }
          itemsToAdd.push(
            createDefaultItem.enhancedBehavior(localize('obedient'), 3),
            createDefaultItem.realWorldNaivete(),
          );
        }
        await proxy.itemOperations.add(...itemsToAdd);
        const { updater } = proxy;
        if (this.characterData.template === CharacterTemplate.Muse) {
          const specialization = '';
          updater
            .path('system', 'settings')
            .store({
              canDefault: false,
              trackPoints: false,
              trackReputations: false,
              characterDetails: false,
              threatDetails: false,
              useThreat: false,
            })
            .path('system', 'skills')
            .store({
              infosec: { points: 20, specialization },
              interface: { points: 50, specialization },
              perceive: { points: 10, specialization },
              program: { points: 20, specialization },
              research: { points: 20, specialization },
            })
            .path('system', 'fieldSkills', FieldSkillType.Hardware)
            .store(
              addFeature(
                createFieldSkillData({
                  field: localize('electronics'),
                  points: 20,
                }),
              ),
            )
            .path('system', 'fieldSkills', FieldSkillType.Medicine)
            .store(
              addFeature(
                createFieldSkillData({
                  field: localize('psychosurgery'),
                  points: 20,
                }),
              ),
            )
            .path('system', 'fieldSkills', FieldSkillType.Know)
            .store(
              createPipe(
                addFeature(
                  createFieldSkillData({
                    points: 50,
                    field: localize('accounting'),
                  }),
                ),
                addFeature(
                  createFieldSkillData({
                    points: 50,
                    field: localize('psychology'),
                  }),
                ),
                addFeature(
                  createFieldSkillData({
                    points: 30,
                    field: '-----',
                  }),
                ),
                addFeature(
                  createFieldSkillData({
                    points: 30,
                    field: '-----',
                  }),
                ),
              ),
            );
        } else if (this.characterData.template === CharacterTemplate.Threat) {
          updater.path('system', 'settings').store({
            trackPoints: false,
            characterDetails: false,
            threatDetails: true,
            useThreat: true,
          });
        }
        await updater
          .path('flags', EP.Name, sleeveData.type)
          .commit(sleeveData);
      }
      this.characterData.name = '';
    } else {
      await this.createActor(this.sleeveData);
      this.sleeveData.name = '';
    }
    await this.requestUpdate();
    this.selectedSleeve = null;
    if (this.options.closeOnCreate) closeWindow(ActorCreator);
    else if (this.isConnected) this.focusFirstInput();
  }

  render() {
    const { actorKind } = this;
    const { form, ready } =
      actorKind === ActorKind.Character
        ? this.characterForm()
        : this.sleeveForm();
    return html`
      <mwc-tab-bar>
        ${enumValues(ActorKind).map(
          (kind) => html`
            <mwc-tab
              minWidth
              isFadingIndicator
              label=${localize(kind)}
              @click=${() => (this.actorKind = kind)}
            ></mwc-tab>
          `,
        )}
      </mwc-tab-bar>

      <div class="main-form" @keydown=${this.clickSubmit}>${form}</div>

      ${renderAutoForm({
        classes: 'options-form',
        props: this.options,
        update: this.updateOptions,
        fields: ({ renderSheet, closeOnCreate, actorLink }) => [
          renderLabeledCheckbox(renderSheet),
          renderLabeledCheckbox({
            ...closeOnCreate,
            label: `${localize('close')} ${localize('on')} ${localize(
              'create',
            )}`,
          }),
          renderLabeledCheckbox(actorLink),
        ],
      })}

      <submit-button
        class="create-button"
        label="${localize('create')} ${localize(actorKind)}"
        ?complete=${ready}
        @submit-attempt=${() => {
          this.actorForm.IsValid({ report: true });
          if (ready) this.create();
        }}
      ></submit-button>
    `;
  }

  private sleeveForm() {
    const { folders } = this;
    return {
      ready: !!this.sleeveData.name,
      form: renderAutoForm({
        storeOnInput: true,
        noDebounce: true,
        props: this.sleeveData,
        update: this.updateSleeveData,
        fields: ({ type, name, folder }) => [
          renderSelectField(type, sleeveTypes),
          renderTextField(name, { required: true }),
          notEmpty(folders)
            ? renderSelectField(folder, Object.keys(folders), {
                emptyText: '-',
                altLabel: (id) => folders[id] || id,
              })
            : '',
        ],
      }),
    };
  }

  private characterForm() {
    const { folders } = this;

    return {
      ready: !!this.characterData.name,
      form: html`
        ${renderAutoForm({
          storeOnInput: true,
          noDebounce: true,
          props: this.characterData,
          update: this.updateCharacterData,
          fields: ({ name, template, folder }) => [
            renderSelectField(template, enumValues(CharacterTemplate)),
            renderTextField(
              { ...name, label: `${localize('ego')} ${localize('name')}` },
              { required: true },
            ),
            notEmpty(folders)
              ? renderSelectField(folder, Object.keys(folders), {
                  emptyText: '-',
                  altLabel: (id) => folders[id] || id,
                })
              : '',
          ],
        })}

        <sl-popover
          placement=${Placement.Left}
          .renderOnDemand=${() => {
            const available = ownedSleeves();
            return html`
              <mwc-list>
                ${notEmpty(available)
                  ? ownedSleeves().map(
                      (sleeve) => html`
                        <mwc-list-item
                          twoline
                          @keydown=${clickIfEnter}
                          graphic="medium"
                          @click=${() => (this.selectedSleeve = sleeve)}
                        >
                          ${this.renderSleeveItemContent(sleeve)}
                        </mwc-list-item>
                      `,
                    )
                  : html`
                      <mwc-list-item>
                        <span
                          >${localize('no')} ${localize('sleeves')}
                          ${localize('available')}</span
                        >
                      </mwc-list-item>
                    `}
              </mwc-list>
            `;
          }}
        >
          <mwc-list-item
            slot="base"
            graphic="medium"
            twoline
            tabindex="0"
            @keydown=${clickIfEnter}
          >
            ${this.renderSleeveItemContent(
              this.selectedSleeve || this.defaultSleeveData,
            )}
          </mwc-list-item>
        </sl-popover>
      `,
    };
  }

  private renderSleeveItemContent(
    sleeve: Pick<Sleeve, 'img' | 'name' | 'type'>,
  ) {
    return html`
      <img slot="graphic" src=${sleeve.img} />
      <span>${sleeve.name}</span>
      <span slot="secondary">${localize(sleeve.type)}</span>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'actor-creator': ActorCreator;
  }
}
