import { createMessage, MessageVisibility } from '@src/chat/create-message';
import {
  emptyTextDash,
  renderFormulaField,
  renderLabeledCheckbox,
  renderSelectField,
  renderTextField,
  renderTimeField,
} from '@src/components/field/fields';
import { renderSubmitForm } from '@src/components/form/forms';
import { UseWorldTime } from '@src/components/mixins/world-time-mixin';
import { enumValues } from '@src/data-enums';
import type { Character } from '@src/entities/actor/proxies/character';
import type { Infomorph } from '@src/entities/actor/proxies/infomorph';
import type { Sleeve } from '@src/entities/actor/sleeves';
import { ArmorType } from '@src/features/active-armor';
import type { StringID } from '@src/features/feature-helpers';
import {
  CommonInterval,
  currentWorldTimeMS,
  prettyMilliseconds,
} from '@src/features/time';
import { localize } from '@src/foundry/localization';
import { rollFormula, rollLabeledFormulas } from '@src/foundry/rolls';
import type { BiologicalHealth } from '@src/health/biological-health';
import { HealthType } from '@src/health/health';
import {
  createDamageOverTime,
  DamageOverTime,
} from '@src/health/health-changes';
import {
  HealOverTimeTarget,
  formatAutoHealing,
  HealingSlot,
  Recovery,
  RecoveryConditions,
  recoveryMultiplier,
} from '@src/health/recovery';
import type { SyntheticHealth } from '@src/health/synthetic-health';
import { openMenu } from '@src/open-menu';
import { notEmpty } from '@src/utility/helpers';
import {
  customElement,
  LitElement,
  property,
  html,
  internalProperty,
} from 'lit-element';
import { classMap } from 'lit-html/directives/class-map';
import { compact, pick } from 'remeda';
import styles from './character-view-physical-health.scss';

@customElement('character-view-physical-health')
export class CharacterViewPhysicalHealth extends UseWorldTime(LitElement) {
  static get is() {
    return 'character-view-physical-health' as const;
  }

  static styles = [styles];

  @property({ attribute: false }) character!: Character;

  @property({ attribute: false }) sleeve!: Exclude<Sleeve, Infomorph>;

  @property({ attribute: false }) health!: BiologicalHealth | SyntheticHealth;

  @internalProperty() private dotForm = false;

  private toggleDotForm() {
    this.dotForm = !this.dotForm;
  }

  private openHealthEditor() {
    this.character.openHealthEditor(this.health);
  }

  private async rollDamageOverTime(dot: StringID<DamageOverTime>) {
    // TODO Account for multiple instances

    createMessage({
      data: {
        header: { heading: `${dot.source} ${localize('damageOverTime')}` },
        damage: {
          ...pick(dot, [
            'armorPiercing',
            'armorUsed',
            'reduceAVbyDV',
            'source',
          ]),
          rolledFormulas: rollLabeledFormulas([
            {
              label: localize('damage'),
              formula: dot.formula,
            },
          ]),
          damageType: HealthType.Physical,
          cumulativeDotID: dot.id,
        },
      },
      entity: this.character,
    });
  }

  private async rollHeal(target: HealOverTimeTarget, heal: Recovery) {
    // TODO Account for multiple instances
    await createMessage({
      data: {
        header: {
          heading: heal.source,
          subheadings: localize('healthRecovery'),
        },
        heal: {
          source: heal.source,
          healthType: HealthType.Physical,
          ...(target === HealOverTimeTarget.Damage
            ? {
                damageFormulas: rollLabeledFormulas([
                  {
                    label: localize('heal'),
                    formula: heal.amount,
                  },
                ]),
              }
            : { wounds: rollFormula(heal.amount)?.total || 0 }),
        },
      },
      // visibility: MessageVisibility.WhisperGM,
      entity: this.character,
    });
    await this.health.logHeal(heal.slot);
  }

  private recoveryConditionsMenu() {
    openMenu({
      header: { heading: `${localize('recovery')} ${localize('conditions')}` },
      content: enumValues(RecoveryConditions).map((condition) => ({
        label: localize(condition),
        callback: () => this.sleeve.updateRecoveryConditions(condition),
      })),
    });
  }

  render() {
    const { health } = this;
    const { regenState, recoveries } = health;
    const { recoveryConditions } = this.sleeve;
    // TODO Account for passing intervals
    // TODO Conditions
    return html`
      <character-view-drawer-heading
        >${localize('physicalHealth')}</character-view-drawer-heading
      >

      <mwc-button
        class="heal-damage"
        icon="launch"
        @click=${this.openHealthEditor}
        >${localize('heal')} / ${localize('damage')}</mwc-button
      >

      <health-state-form .health=${health}></health-state-form>

      <section>
        <sl-header heading=${localize('recovery')}>
          <mwc-button
            dense
            slot="action"
            @click=${this.recoveryConditionsMenu}
            ?disabled=${this.character.disabled}
            class="conditions-button"
            >${localize(recoveryConditions)} ${localize('conditions')}
            ${recoveryConditions !== RecoveryConditions.Normal
              ? `x${recoveryMultiplier(recoveryConditions)}`
              : ''}</mwc-button
          >
        </sl-header>
        ${enumValues(HealOverTimeTarget).map((target) => {
          const heals = recoveries[target];
          return notEmpty(heals)
            ? html`
                <figure>
                  <figcaption>${localize(target)}</figcaption>
                  <ul>
                    ${[...heals.values()].map((heal) => {
                      const timeToTick =
                        regenState === target && heal.timeState.remaining;
                      return html`
                        <wl-list-item
                          class="heal ${timeToTick === 0 ? 'ready' : ''}"
                          ?disabled=${this.character.disabled}
                          clickable
                          @click=${() => this.rollHeal(target, heal)}
                        >
                          <span slot="before">${heal.source}</span>
                          <span
                            >${formatAutoHealing(heal, recoveryConditions)}
                          </span>
                          ${timeToTick !== false
                            ? html`
                                <span slot="after">
                                  ${timeToTick === 0
                                    ? localize('ready')
                                    : ` ${localize('tick')} ${localize('in')}
                                  ${prettyMilliseconds(timeToTick)}`}
                                </span>
                              `
                            : ''}
                        </wl-list-item>
                      `;
                    })}
                  </ul>
                </figure>
              `
            : '';
        })}
      </section>

      <section>
        <sl-header heading=${localize('damageOverTime')}>
          <mwc-icon-button
            ?disabled=${this.character.disabled}
            class="dot-toggle ${classMap({ active: this.dotForm })}"
            icon="add"
            slot="action"
            @click=${this.toggleDotForm}
          ></mwc-icon-button>
        </sl-header>
        ${this.dotForm ? this.renderDamageOverTimeCreator() : ''}

        <sl-animated-list>
          ${this.health.data.dots.map(
            (dot) => html`
              <wl-list-item
                clickable
                @click=${() => this.rollDamageOverTime(dot)}
              >
                <span slot="before">${dot.source}</span>
                <span>${dot.formula}</span>
              </wl-list-item>
            `,
          )}
        </sl-animated-list>
      </section>

      <sl-details summary=${localize('history')}>
        <health-log
          .health=${health}
          ?disabled=${this.character.disabled}
        ></health-log>
      </sl-details>
    `;
  }

  private renderDamageOverTimeCreator() {
    return renderSubmitForm({
      classes: 'dot-creator',
      props: {
        ...createDamageOverTime({
          formula: '1d6',
          source: '',
          duration: CommonInterval.Turn,
        }),
        armor: ArmorType.Kinetic,
      },
      update: (changed, orig) => {
        const { armor, ...dot } = { ...orig, ...changed };
        this.health.addDamageOverTime({
          ...dot,
          startTime: currentWorldTimeMS(),
          armorUsed: compact([armor]),
        });
      },
      fields: ({
        formula,
        armorPiercing,
        reduceAVbyDV,
        source,
        duration,
        armor,
      }) => [
        renderTextField(source, { required: true }),
        renderFormulaField(formula, { required: true }),
        renderSelectField(armor, enumValues(ArmorType), emptyTextDash),
        renderLabeledCheckbox(armorPiercing),
        renderLabeledCheckbox(reduceAVbyDV),
        renderTimeField(duration, { min: CommonInterval.Turn }),
      ],
    });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'character-view-physical-health': CharacterViewPhysicalHealth;
  }
}
