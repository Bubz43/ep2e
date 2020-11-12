import { renderSelectField, renderLabeledCheckbox } from "@src/components/field/fields";
import { GearQuality, enumValues, Complexity, GearTrait } from "@src/data-enums";
import { complexityGP } from "@src/features/complexity";
import { localize } from "@src/foundry/localization";
import type { GearCost } from "@src/foundry/template-schema";
import type { FieldPropsRenderer } from "@src/utility/field-values";
import { css } from "lit-element";
import type { TemplateResult } from "lit-html";

export const renderComplexityFields: FieldPropsRenderer<
  GearCost & { quality: GearQuality }
> = ({ quality, complexity, restricted }) => [
  renderSelectField(quality, enumValues(GearQuality)),
  renderSelectField(
    {
      ...complexity,
      label: `${localize("complexity")}/${localize("SHORT", "gearPoints")}`,
    },
    enumValues(Complexity),
    { altLabel: (com) => `${localize(com)}/${complexityGP[com]}` }
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
  cssClass: "complexity",
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
