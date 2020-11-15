import type { KineticWeaponAttackData } from '@src/combat/attacks';
import {
  renderSelectField,
  renderLabeledCheckbox,
  renderNumberField,
  renderFormulaField,
  renderTextareaField,
} from '@src/components/field/fields';
import { renderAutoForm, renderUpdaterForm } from '@src/components/form/forms';
import {
  GearQuality,
  enumValues,
  Complexity,
  GearTrait,
  PhysicalWare,
  RangedWeaponAccessory,
  RangedWeaponTrait,
} from '@src/data-enums';
import type { UpdateActions } from '@src/entities/update-store';
import { pairList } from '@src/features/check-list';
import { complexityGP } from '@src/features/complexity';
import { FiringMode } from '@src/features/firing-modes';
import { localize } from '@src/foundry/localization';
import type { GearCost } from '@src/foundry/template-schema';
import type { FieldPropsRenderer } from '@src/utility/field-values';
import { notEmpty } from '@src/utility/helpers';
import { css } from 'lit-element';
import { html, TemplateResult } from 'lit-html';
import { createPipe, map, objOf } from 'remeda';
import type { Firearm } from '../../proxies/firearm';
import type { Railgun } from '../../proxies/railgun';
import type { FirearmForm } from './firearm/firearm-form';
import type { RailgunForm } from './railgun/railgun-form';

export const renderComplexityFields: FieldPropsRenderer<
  GearCost & { quality: GearQuality }
> = ({ quality, complexity, restricted }) => [
  renderSelectField(quality, enumValues(GearQuality)),
  renderSelectField(
    {
      ...complexity,
      label: `${localize('complexity')}/${localize('SHORT', 'gearPoints')}`,
    },
    enumValues(Complexity),
    { altLabel: (com) => `${localize(com)}/${complexityGP[com]}` },
  ),
  renderLabeledCheckbox(restricted),
];

export const complexityForm = {
  styles: css`
    .complexity {
      display: grid;
      grid-auto-flow: column;
      grid-template-columns: 1fr 1fr auto;
      padding-bottom: 0;
    }
  `,
  cssClass: 'complexity',
} as const;

export const renderGearTraitCheckboxes: FieldPropsRenderer<Record<
  GearTrait,
  boolean
>> = (gearTraits) => {
  const checkboxes: TemplateResult[] = [];
  for (const trait of enumValues(GearTrait)) {
    checkboxes.push(renderLabeledCheckbox(gearTraits[trait]));
  }
  return checkboxes;
};

export const renderWeaponTraitCheckboxes: FieldPropsRenderer<Record<
  RangedWeaponTrait,
  boolean
>> = (traits) => {
  const checkboxes: TemplateResult[] = [];
  for (const trait of enumValues(RangedWeaponTrait)) {
    checkboxes.push(renderLabeledCheckbox(traits[trait]));
  }
  return checkboxes;
};

export const renderKineticWeaponSidebar: FieldPropsRenderer<
  Firearm['epData'] | Railgun['epData']
> = function (
  this: FirearmForm | RailgunForm,
  { wareType, range, fixed, long, shapeChanging, ...traits },
) {
  return [
    renderSelectField(wareType, enumValues(PhysicalWare), {
      emptyText: '-',
    }),
    renderNumberField(
      { ...range, label: `${range.label} (${localize('meters')})` },
      { min: 1 },
    ),
    renderLabeledCheckbox(shapeChanging, {
      disabled: shapeChanging.value && (notEmpty(this.item.shapes) || this.item.nestedShape),
    }),
    html`<entity-form-sidebar-divider
      label="${localize('weapon')} ${localize('traits')}"
    ></entity-form-sidebar-divider>`,
    renderLabeledCheckbox(fixed),
    renderLabeledCheckbox(long),
    html`<entity-form-sidebar-divider
      label=${localize('gearTraits')}
    ></entity-form-sidebar-divider>`,
    renderGearTraitCheckboxes(traits),
  ];
};
type Accessories = RangedWeaponAccessory[];

export const renderRangedAccessoriesEdit = (
  accessories: Accessories,
  possible: Readonly<Accessories>,
  updateCB: (updated: Accessories) => unknown,
) => {
  const [pairedAccessories, change] = pairList(accessories, possible);
  return html`
    <h3>${localize('accessories')}</h3>
    ${renderAutoForm({
      props: pairedAccessories,
      update: createPipe(change, updateCB),
      fields: (accessories) =>
        map(Object.values(accessories), renderLabeledCheckbox),
    })}
  `;
};

export const accessoriesListStyles = css`
  .accessories-list {
    display: flex;
    flex-flow: row wrap;
    padding: 0 0.5rem 0.5rem;
    position: relative;
  }
  .accessories-list > li {
    list-style: none;
    display: inline-block;
    padding: 0.15rem 0.5rem;
    background: var(--color-border);
    border-radius: 7px;
    margin: 0.5rem 0.5rem 0 0;
  }
`;

export const renderFiringModeCheckboxes = (
  updateActions: UpdateActions<{ firingModes: FiringMode[] }>,
) => {
  const { firingModes } = updateActions.originalValue();
  const [pairFiringModes, change] = pairList(
    firingModes,
    enumValues(FiringMode),
  );
  const onlyOneMode = firingModes.length === 1;
  return renderAutoForm({
    props: pairFiringModes,
    update: createPipe(change, objOf('firingModes'), updateActions.commit),
    fields: (firingModes) =>
      Object.values(firingModes).map((mode) =>
        renderLabeledCheckbox(mode, {
          disabled: onlyOneMode && mode.value,
        }),
      ),
  });
};

export const renderKineticAttackEdit = (
  updater: UpdateActions<KineticWeaponAttackData>,
) => {
  return html`
    <h3>${localize('attack')}</h3>
    ${renderUpdaterForm(updater, {
      classes: 'drawer-attack',
      fields: ({ damageFormula }) => renderFormulaField(damageFormula),
    })}
    <p class="label">${localize('firingModes')}</p>
    ${renderFiringModeCheckboxes(updater)}
    ${renderUpdaterForm(updater, {
      fields: ({ notes }) => renderTextareaField(notes),
    })}
  `;
};
