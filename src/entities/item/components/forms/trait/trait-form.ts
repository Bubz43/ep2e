import {
  renderLabeledSwitch,
  renderNumberField,
  renderSelectField,
  renderTextareaField,
  renderTextField,
} from '@src/components/field/fields';
import { renderAutoForm, renderUpdaterForm } from '@src/components/form/forms';
import { enumValues, TraitSource, TraitType } from '@src/data-enums';
import { entityFormCommonStyles } from '@src/entities/components/form-layout/entity-form-common-styles';
import type { Trait } from '@src/entities/item/proxies/trait';
import type { EffectCreatedEvent } from '@src/features/components/effect-creator/effect-created-event';
import { multiplyEffectModifier } from '@src/features/effects';
import {
  addFeature,
  addUpdateRemoveFeature,
  idProp,
  StringID,
  updateFeature,
} from '@src/features/feature-helpers';
import { localize } from '@src/foundry/localization';
import { openMenu } from '@src/open-menu';
import {
  customElement,
  html,
  internalProperty,
  property,
  PropertyValues,
} from 'lit-element';
import { classMap } from 'lit-html/directives/class-map';
import { repeat } from 'lit-html/directives/repeat';
import { range, take, first } from 'remeda';
import { ItemFormBase } from '../item-form-base';
import { TraitFormLevel } from './trait-form-level';
import styles from './trait-form.scss';
import type { UpdatedTraitLevelEvent } from './updated-trait-level-event';

@customElement('trait-form')
export class TraitForm extends ItemFormBase {
  static get is() {
    return 'trait-form' as const;
  }

  static styles = [entityFormCommonStyles, styles];

  @property({ attribute: false }) item!: Trait;

  @internalProperty() private levelCount = 1;

  @internalProperty() private levels = range(1, 5);

  @internalProperty() addEffectLevel = 0;

  private readonly levelOps = addUpdateRemoveFeature(
    () => this.item.updater.path('data', 'levels').commit,
  );

  update(changedProps: PropertyValues) {
    if (changedProps.has('item')) {
      this.levelCount = this.item.levels.length;
      this.addEffectLevel = Math.min(this.levelCount, this.addEffectLevel);
      this.setupLevels(this.item.levels.map((l) => l.cost));
    }
    super.update(changedProps);
  }

  private addCreatedEffect(ev: EffectCreatedEvent) {
    const level = this.item.levels[this.addEffectLevel];
    if (level) {
      this.levelOps.update(
        { effects: addFeature(level.effects, ev.effect) },
        { id: level.id },
      );
    }
  }

  private setupLevels(current: number[]) {
    const { levels } = this;
    range(0, 4).forEach((_, index) => {
      const atIndex = current[index] || levels[index - 1]! + 1;
      const previous = levels[index - 1] || 0;
      levels[index] = previous >= atIndex ? previous + 1 : atIndex;
    });
  }

  private updateTraitLevel({ level }: UpdatedTraitLevelEvent) {
    this.levelOps.update(level, { id: level.id });
  }

  private updateLevels() {
    const { levels, updater } = this.item;
    const { levels: levelCosts, levelCount } = this;
    updater.path('data', 'levels').commit(() =>
      take(levelCosts, levelCount).reduce((accum, cost, index) => {
        const existing = accum[index];
        return existing
          ? updateFeature(accum, { id: existing.id, cost })
          : addFeature(accum, {
              cost,
              effects:
                first(accum)?.effects.map((effect) => ({
                  ...multiplyEffectModifier(effect, index + 1),
                  id: effect.id,
                })) || [],
            });
      }, take(levels, levelCount)),
    );
  }

  private copyEffectsToLevel({ currentTarget }: Event) {
    if (currentTarget instanceof TraitFormLevel) {
      const baseEffects = this.item.defaultLevel.effects;
      const multiplied = baseEffects.map((effect) => ({
        ...multiplyEffectModifier(effect, currentTarget.index + 1),
        id: effect.id,
      }));
      this.levelOps.update(
        { effects: multiplied },
        { id: currentTarget.level.id },
      );
    }
  }

  updateLevelCount = ({ levelCount = 1 }: Partial<{ levelCount: number }>) => {
    this.levelCount = levelCount;
    this.updateLevels();
  };

  private setAddEffectForm(ev: Event) {
    this.addEffectLevel = (ev.currentTarget as TraitFormLevel).index;
    this.setDrawer(this.renderEffectCreator);
  }

  private openLevelSelector(ev: MouseEvent) {
    const { levelIndex, levels } = this.item;
    openMenu({
      header: { heading: `${localize('current')} ${localize('level')}` },
      content: levels.map((_, index) => ({
        label: `${localize('level')} ${index + 1}`,
        callback: () => this.item.updateLevel(index),
        activated: levelIndex === index,
      })),
      position: ev,
    });
  }

  render() {
    const {
      updater,
      type,
      triggered,
      hasMultipleLevels,
      levels,
      restrictions,
      triggers,
      embedded,
    } = this.item;
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
          ${triggered ? html`<li slot="tag">${localize('triggered')}</li>` : ''}
        </entity-form-header>

        <div slot="details">
          <section>
            ${disabled
              ? ''
              : html`
                  <sl-header heading=${localize('details')}>
                    ${!!triggers && embedded
                      ? renderUpdaterForm(updater.path('data', 'state'), {
                          slot: 'action',
                          fields: ({ triggered }) =>
                            renderLabeledSwitch(triggered, { alignEnd: true }),
                        })
                      : ''}
                    ${embedded && hasMultipleLevels
                      ? html`
                          <mwc-icon-button
                            class="level-selector"
                            slot="action"
                            icon="list"
                            ?disabled=${disabled}
                            @click=${this.openLevelSelector}
                          ></mwc-icon-button>
                        `
                      : ''}
                    <mwc-icon-button
                      slot="action"
                      icon="settings"
                      ?disabled=${disabled}
                      @click=${this.setDrawerFromEvent(this.renderSettings)}
                    ></mwc-icon-button>
                  </sl-header>
                `}
            ${renderUpdaterForm(updater.path('data'), {
              disabled,
              classes: 'info-form',
              fields: ({ traitType, subtype, source }) => [
                renderSelectField(traitType, enumValues(TraitType)),
                renderSelectField(source, enumValues(TraitSource), {
                  disabled: this.item.lockSource,
                }),
                renderTextField(subtype),
              ],
            })}
            ${restrictions
              ? html`
                  <sl-group label=${localize('restrictions')}
                    >${restrictions}</sl-group
                  >
                `
              : ''}
            ${triggers
              ? html`
                  <sl-group label=${localize('triggers')}>${triggers}</sl-group>
                `
              : ''}
          </section>
        </div>

        <sl-animated-list
          slot="details"
          skipExitAnimation
          transformOrigin="top"
        >
          ${repeat(levels, idProp, this.renderLevel)}
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

  private renderSettings() {
    const { levels, levelCount } = this;
    return html`
      <h3>${localize('settings')}</h3>

      <div class="level-settings">
        ${renderAutoForm({
          props: { levelCount },
          update: this.updateLevelCount,
          classes: 'level-count-form',
          fields: ({ levelCount }) =>
            renderNumberField(
              { ...levelCount, label: localize('levels') },
              { min: 1, max: 4 },
            ),
        })}
      </div>
      <div class="level-costs">
        ${take(levels, levelCount).map((cost, index, list) =>
          renderAutoForm({
            props: { cost },
            update: ({ cost }) => {
              list[index] = cost!;
              this.setupLevels(list);
              this.updateLevels();
            },
            fields: ({ cost }) =>
              renderNumberField(
                {
                  ...cost,
                  label: `${localize('level')} ${index + 1} ${
                    this.item.costInfo
                  }`,
                },
                { min: list[index - 1]! + 1 || 1 },
              ),
          }),
        )}
      </div>
      ${renderUpdaterForm(this.item.updater.path('data'), {
        classes: 'text-areas',
        fields: ({ restrictions, triggers }) => [
          renderTextareaField(restrictions),
          renderTextareaField(triggers),
        ],
      })}
    `;
  }

  private renderLevel = (
    level: StringID<Trait['levelInfo']>,
    index: number,
  ) => {
    return html`
      <trait-form-level
        class=${classMap({ active: this.item.checkIfLevelActive(index) })}
        @updated-trait-level=${this.updateTraitLevel}
        @request-add-effect-form=${this.setAddEffectForm}
        @request-effect-import=${this.copyEffectsToLevel}
        .level=${level}
        index=${index}
        ?disabled=${this.disabled}
        ?showIndex=${this.item.hasMultipleLevels}
        costInfo=${this.item.costInfo}
      ></trait-form-level>
    `;
  };

  private renderEffectCreator() {
    return html`
      <h3>${localize('add')} ${localize('effect')}</h3>

      ${this.item.hasMultipleLevels
        ? html`
            ${renderAutoForm({
              props: { level: this.addEffectLevel + 1 },
              update: ({ level = 0 }) => (this.addEffectLevel = level - 1),
              classes: 'add-effect-level-selector',
              fields: ({ level }) =>
                renderNumberField(level, {
                  min: 1,
                  max: this.item.levels.length,
                }),
            })}
          `
        : ''}
      <effect-creator @effect-created=${this.addCreatedEffect}></effect-creator>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'trait-form': TraitForm;
  }
}
