import type { Damage, Heal } from '@src/health/health-changes';
import {
  renderNumberField,
  renderRadioFields,
} from '@src/components/field/fields';
import { renderAutoForm, renderSubmitForm } from '@src/components/form/forms';
import { Placement } from '@src/components/popover/popover-options';
import {
  closeWindow,
  openWindow,
} from '@src/components/window/window-controls';
import { enumValues } from '@src/data-enums';
import type { ActorEP } from '@src/entities/actor/actor';
import { ActorType } from '@src/entities/entity-types';
import { localize } from '@src/foundry/localization';
import {
  createHealthModification,
  HealthModificationMode,
  HealthType,
} from '@src/health/health';
import type { ActorHealth } from '@src/health/health-mixin';
import {
  customElement,
  html,
  internalProperty,
  LitElement,
  property,
  PropertyValues,
} from 'lit-element';
import { compact, fromPairs, identity, mapToObj } from 'remeda';
import styles from './health-editor.scss';
import { MentalHealth } from '@src/health/mental-health';
import { HealthModificationEvent } from '@src/health/health-modification-event';
import { notEmpty } from '@src/utility/helpers';
import { addFeature } from '@src/features/feature-helpers';
import { isSleeve } from '@src/entities/actor/sleeves';
import { createMessage, MessageVisibility } from '@src/chat/create-message';

@customElement('health-editor')
export class HealthEditor extends LitElement {
  static get is() {
    return 'health-editor' as const;
  }

  static styles = [styles];

  static openWindow({
    actor,
    adjacentEl,
    change,
    initialHealth,
  }: {
    actor: ActorEP;
    adjacentEl?: HTMLElement;
    change?: HealthEditor['change'];
    initialHealth?: ActorHealth;
  }) {
    return openWindow({
      key: HealthEditor,
      name: `${localize('health')} ${localize('editor')}`,
      content: html`
        <health-editor
          .actor=${actor}
          .change=${change}
          .health=${initialHealth}
        ></health-editor>
      `,
      adjacentEl,
      forceFocus: true,
    });
  }

  @property({ attribute: false }) actor!: ActorEP;

  @property({ type: Object }) change?: Damage | Heal | null;

  @property({ attribute: false }) health?: ActorHealth | null;

  @internalProperty() healthType = HealthType.Physical;

  @internalProperty() mode: 'heal' | 'damage' = 'heal';

  @internalProperty() private selectedHealth: ActorHealth | null = null;

  private actorUnsub: (() => void) | null = null;

  disconnectedCallback() {
    this.cleanupSub();
    this.change = null;
    super.disconnectedCallback();
  }

  update(changedProps: PropertyValues) {
    if (changedProps.has('actor')) {
      this.cleanupSub();
      this.actor.subscriptions.subscribe(this, {
        onEntityUpdate: () => this.requestUpdate(),
        onSubEnd: () => closeWindow(HealthEditor),
      });
    }
    if (changedProps.has('change') && this.change) {
      this.healthType = this.change.type;
      this.mode = this.change.kind;
    }
    if (
      changedProps.get('health') !== undefined &&
      this.health?.type === this.healthType
    ) {
      this.selectedHealth = this.health;
    }
    super.update(changedProps);
  }

  updated(changedProps: PropertyValues) {
    if (changedProps.has('healthType')) {
      requestAnimationFrame(() => {
        this.renderRoot
          .querySelector<HTMLElement>(
            `mwc-tab[data-health="${this.healthType}"]`,
          )
          ?.click();
      });
    }

    super.update(changedProps);
  }

  firstUpdated() {
    this.addEventListener(
      HealthModificationEvent.is,
      this.applyModification.bind(this),
    );
  }

  private cleanupSub() {
    this.actorUnsub?.();
    this.actorUnsub = null;
    this.selectedHealth = null;
  }

  private get filteredHealths() {
    return this.actor.proxy.healths.filter(
      ({ type }) => type === this.healthType,
    );
  }

  private get damage() {
    return this.change?.kind === 'damage' &&
      this.change.type === this.healthType
      ? this.change
      : null;
  }

  private get heal() {
    return this.change?.kind === 'heal' && this.change.type === this.healthType
      ? this.change
      : null;
  }

  private get armor() {
    return this.actor.proxy.type === ActorType.Character
      ? this.actor.proxy.armor
      : null;
  }

  private async applyModification({
    modification,
    armorReduction,
  }: HealthModificationEvent) {
    const { currentHealth } = this;
    if (!currentHealth) return;
    await createMessage({
      data: {
        header: {
          heading: `${currentHealth.source} ${localize(
            currentHealth.type,
          )} ${localize('health')}`,
          img: currentHealth.icon
        },
        healthChange: {
          ...modification,
          healthType: currentHealth.type,
          passedThreshold: '', // TODO figure out when to put this
          reducedArmor: armorReduction
            ? mapToObj([...armorReduction], identity)
            : undefined,
        },
      },
      visibility: MessageVisibility.WhisperGM,
    });

    this.actor.updater.batchCommits(async () => {
      await currentHealth.applyModification(modification);
      if (notEmpty(armorReduction)) {
        const sleeve = isSleeve(this.actor.proxy)
          ? this.actor.proxy
          : this.actor.proxy.sleeve;
        await sleeve?.addArmorDamage(armorReduction, modification.source);
      }
    });
  }

  private get currentHealth() {
    const { filteredHealths } = this;
    return (
      (this.selectedHealth &&
        filteredHealths.includes(this.selectedHealth) &&
        this.selectedHealth) ||
      filteredHealths[0]
    );
  }

  render() {
    const { filteredHealths, currentHealth } = this;
    const { name, img } = this.actor.tokenOrLocalInfo;
    return html`
      <mwc-list-item
        graphic="medium"
        twoline
        @click=${() => this.actor.sheet.render(true)}
      >
        <img slot="graphic" src=${img} />
        <span>${name}</span>
        <span slot="secondary"
          >${compact([
            localize(this.actor.type),
            this.actor.proxy.type === ActorType.Character &&
            this.actor.proxy.sleeve
              ? localize(this.actor.proxy.sleeve.type)
              : '',
          ]).join(' / ')}</span
        >
      </mwc-list-item>

      <mwc-tab-bar>
        ${enumValues(HealthType).map(
          (type) => html`
            <mwc-tab
              isFadingIndicator
              label=${localize(type)}
              data-health=${type}
              @click=${() => (this.healthType = type)}
            ></mwc-tab>
          `,
        )}
      </mwc-tab-bar>

      ${currentHealth
        ? html`
            <sl-popover
              placement=${Placement.Left}
              .renderOnDemand=${() => html`
                <ul class="healths">
                  ${filteredHealths.map(
                    (health) => html`
                      <health-item
                        .health=${health}
                        clickable
                        @click=${() => (this.selectedHealth = health)}
                      ></health-item>
                    `,
                  )}
                </ul>
              `}
            >
              <health-item
                slot="base"
                .health=${currentHealth}
                clickable
              ></health-item>
            </sl-popover>

            ${renderAutoForm({
              classes: 'mode-form',
              props: { mode: this.mode },
              update: ({ mode }) => mode && (this.mode = mode),
              fields: ({ mode }) => [
                renderRadioFields(mode, ['heal', 'damage']),
              ],
            })}
            ${this.mode === 'heal'
              ? this.renderHealForm(currentHealth, this.heal)
              : this.renderDamageEditor(currentHealth, this.damage)}
          `
        : html`
            <p>
              ${localize('no')} ${localize(this.healthType)}
              ${localize('health')}
            </p>
          `}
    `;
  }

  private renderDamageEditor(health: ActorHealth, change?: Damage | null) {
    if (health instanceof MentalHealth) {
      const stress = change?.type === HealthType.Mental ? change : null;
      return html`
        <mental-health-stress-editor
          .health=${health}
          .stress=${stress}
          .armor=${this.armor}
        ></mental-health-stress-editor>
      `;
    }

    // TODO Physical and Mesh
    return '';
  }

  private renderHealForm(health: ActorHealth, change?: Heal | null) {
    const { main, wound } = health;
    return renderSubmitForm({
      props: change || { damage: 0, wounds: 0 },
      classes: 'heal-editor',
      update: ({ damage = 0, wounds = 0 }) => {
        this.dispatchEvent(
          new HealthModificationEvent(
            createHealthModification({
              mode: HealthModificationMode.Heal,
              damage,
              wounds,
              source: change?.source || localize('editor'),
            }),
          ),
        );
      },
      fields: ({ damage, wounds }) => [
        renderNumberField(
          { ...damage, label: main.damage.label },
          {
            min: 0,
            max: main.damage.value,
          },
        ),
        wound
          ? renderNumberField(
              { ...wounds, label: wound.wounds.label },
              {
                min: 0,
                max: wound.wounds.value,
              },
            )
          : '',
      ],
    });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'health-editor': HealthEditor;
  }
}
