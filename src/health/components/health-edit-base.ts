import { enumValues } from '@src/data-enums';
import { ActiveArmor, ArmorType } from '@src/features/active-armor';
import { localize } from '@src/foundry/localization';
import { rollLimit } from '@src/foundry/rolls';
import { notEmpty, withSign } from '@src/utility/helpers';
import {
  html,
  internalProperty,
  LitElement,
  property,
  PropertyValues
} from 'lit-element';
import { pick, set } from 'remeda';
import {
  createHealthModification,
  formatDamageType,
  HealthModificationMode
} from '../health';
import type { Damage, RollMultiplier } from '../health-changes';
import type { ActorHealth } from '../health-mixin';
import { HealthModificationEvent } from '../health-modification-event';
import styles from './health-edit-base.scss';

export abstract class HealthEditBase<
  H extends ActorHealth,
  D extends Damage
> extends LitElement {
  protected abstract createEditable(): D;

  static get styles() {
    return [styles];
  }

  @property({ attribute: false }) health!: H;

  @property({ type: Object }) damage?: D | null;

  @property({ attribute: false }) armor?: ActiveArmor | null;

  @internalProperty() protected editableDamage!: D;

  @internalProperty() protected overrides?: Partial<{
    takeMinimum: boolean;
    damage: number;
    wounds: number;
  }>;

  update(changedProps: PropertyValues<this>) {
    if (changedProps.has('damage')) {
      this.editableDamage = this.createEditable();
      this.overrides = {};
    }
    super.update(changedProps);
  }

  protected setMultiplier(ev: CustomEvent<RollMultiplier>) {
    this.editableDamage = { ...this.editableDamage, multiplier: ev.detail };
  }

  protected createModification() {
    const { damage, wounds } = this.computed;
    return createHealthModification({
      mode: HealthModificationMode.Inflict,
      damage,
      wounds,
      source: this.damage?.source || localize('editor'),
    });
  }

  protected emitChange() {
    if (this.editableDamage.damageValue) {
      this.dispatchEvent(
        new HealthModificationEvent(
          this.createModification(),
          this.editableDamage.reduceAVbyDV
            ? this.computed.armorUsed
            : undefined,
        ),
      );
    }
  }

  protected toggleArmorPiercing() {
    this.editableDamage = {
      ...this.editableDamage,
      armorPiercing: !this.editableDamage.armorPiercing,
    };
  }

  protected toggleArmorReduce() {
    this.editableDamage = {
      ...this.editableDamage,
      reduceAVbyDV: !this.editableDamage.reduceAVbyDV,
    };
  }

  protected toggleTakeMinimum() {
    this.overrides = set(
      this.overrides || {},
      'takeMinimum',
      !this.overrides?.takeMinimum,
    );
  }

  protected toggleUsedArmor(armor: ArmorType) {
    const used = new Set(this.editableDamage.armorUsed);
    if (used.has(armor)) used.delete(armor);
    else used.add(armor);
    this.editableDamage = {
      ...this.editableDamage,
      armorUsed: [...used],
    };
  }

  protected get damageValue() {
    return Math.ceil(
      this.editableDamage.damageValue * this.editableDamage.multiplier,
    );
  }

  protected get computed() {
    const armorUsed = ActiveArmor.mitigateDamage({
      armor: this.armor,
      damage: this.damageValue,
      ...pick(this.editableDamage, [
        'armorPiercing',
        'armorUsed',
        'additionalArmor',
      ]),
    });
    let damage = armorUsed?.appliedDamage ?? this.damageValue;

    const minDV = rollLimit(this.editableDamage.formula, 'min');
    // const max = nonNegative(
    //   (roll?.terms || []).reduce<number>((accum, term, index, list) => {
    //     if (term instanceof DiceTerm) accum += term.number;
    //     else if (
    //       typeof term === 'number' &&
    //       (list[index - 1] === '+' || index === 0)
    //     )
    //       accum += term;
    //     return accum;
    //   }, 0),
    // );

    if (this.overrides?.takeMinimum) damage = Math.min(minDV, damage);

    const wounds = this.health.computeWounds(damage);

    return {
      damage,
      wounds,
      armorUsed: armorUsed?.personalArmorUsed,
      minimumDV: minDV,
    };
  }

  protected renderCommon() {
    const { damage, wounds, minimumDV } = this.computed;

    return html`
      ${notEmpty(this.armor)
        ? html`
            <div class="armors">
              ${enumValues(ArmorType).map((armor) => {
                const active = this.editableDamage.armorUsed.includes(armor);
                return html`
                  <wl-list-item
                    clickable
                    @click=${() => this.toggleUsedArmor(armor)}
                    class="armor ${active ? 'active' : ''}"
                    >${localize(armor)}:
                    ${this.armor?.getClamped(armor)}</wl-list-item
                  >
                `;
              })}
            </div>
          `
        : ''}

      <wl-list-item
        clickable
        @click=${this.toggleTakeMinimum}
        role="button"
        class="min-toggle ${this.overrides?.takeMinimum ? 'active' : ''}"
        ><span
          >${localize('take')} ${localize('minimum')} ${localize('damage')}:
          ${Math.min(minimumDV, damage)}</span
        >
      </wl-list-item>

      <div class="change">
        <sl-group label=${this.health.main.damage.label}
          >${withSign(damage)}</sl-group
        >
        ${this.health.wound
          ? html`
              <sl-group label=${this.health.wound.wounds.label}
                >${withSign(wounds)}</sl-group
              >
            `
          : ''}
      </div>
      <submit-button
        label=${localize('inflict')}
        ?complete=${!!this.editableDamage.damageValue}
        @submit-attempt=${this.emitChange}
      ></submit-button>
    `;
  }

  protected renderMultiplier() {
    return html`
      <div class="multiplier">
        <multiplier-select
          multiplier=${this.editableDamage.multiplier}
          @roll-multiplier=${this.setMultiplier}
        ></multiplier-select>

        ${this.editableDamage.multiplier !== 1
          ? html`
              <span
                >${formatDamageType(this.health.type)} ${this.damageValue}</span
              >
            `
          : ''}
      </div>
    `;
  }
}
