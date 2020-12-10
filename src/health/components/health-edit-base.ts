import { enumValues } from '@src/data-enums';
import { ActiveArmor, ArmorType } from '@src/features/active-armor';
import { localize } from '@src/foundry/localization';
import { rollFormula } from '@src/foundry/rolls';
import { nonNegative, withSign } from '@src/utility/helpers';
import {
  html,
  internalProperty,
  LitElement,
  property,
  PropertyValues,
} from 'lit-element';
import { set } from 'remeda';
import { createHealthModification, HealthModificationMode } from '../health';
import type { Damage } from '../health-changes';
import type { ActorHealth } from '../health-mixin';
import { HealthModificationEvent } from '../health-modification-event';

export abstract class HealthEditBase<
  H extends ActorHealth,
  D extends Damage
> extends LitElement {
  protected abstract createEditable(): D;

  @property({ attribute: false }) health!: H;

  @property({ type: Object }) damage?: D | null;

  @property({ attribute: false }) armor?: ActiveArmor | null;

  @internalProperty() protected editableDamage!: D;

  @internalProperty() protected overrides?: Partial<{
    takeMinimum: boolean;
    damage: number;
    wounds: number;
  }>;

  update(changedProps: PropertyValues) {
    if (changedProps.has('damage')) {
      this.editableDamage = this.createEditable();
      this.overrides = {};
    }
    super.update(changedProps);
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
    const armorUsed = this.armor?.mitigateDamage({
      damage: this.damageValue,
      armorPiercing: this.editableDamage.armorPiercing,
      armorUsed: this.editableDamage.armorUsed,
    });
    let damage = armorUsed?.appliedDamage ?? this.damageValue;

    const roll = rollFormula(this.editableDamage.formula);
    const max = nonNegative(
      (roll?.terms || []).reduce<number>((accum, term, index, list) => {
        if (term instanceof DiceTerm) accum += term.number;
        else if (
          typeof term === 'number' &&
          (list[index - 1] === '+' || index === 0)
        )
          accum += term;
        return accum;
      }, 0),
    );

    if (this.overrides?.takeMinimum) damage = Math.min(max, damage);

    const wounds = this.health.computeWounds(damage);

    return {
      damage,
      wounds,
      armorUsed: armorUsed?.personalArmorUsed,
      minimumDV: max,
    };
  }

  protected renderCommon() {
    const { damage, wounds, minimumDV } = this.computed;

    return html`
      ${this.armor
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
        <sl-group label=${localize('stress')}>${withSign(damage)}</sl-group>
        ${this.health.wound
          ? html`
              <sl-group label=${localize('traumas')}
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
}
