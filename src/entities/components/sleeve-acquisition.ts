import { MorphCost } from "@src/data-enums";
import { formatComplexity } from "@src/features/complexity";
import { localize } from "@src/foundry/localization";
import type { AcquisitionData } from "@src/foundry/template-schema";
import { html } from "lit-html";

export const renderMorphAcquisition = ({ resource, cost, availability, ...gp}: AcquisitionData) => {
  const parts: { label: string; value: string | number }[] = [];

  if (resource === MorphCost.GearPoints) {
    parts.push({
      label: `${localize("complexity")}/${localize("SHORT", "gearPoints")}`,
      value: formatComplexity(gp),
    });
  } else if (resource === MorphCost.MorphPoints) {
    parts.push(
      {
        label: localize("cost"),
        value: `${cost} ${localize("SHORT", "morphPoints")}`,
      },
      {
        label: localize("availability"),
        value: availability,
      }
    );
  }

  return parts.map(
    ({ label, value }) => html`<sl-group label=${label}>${value}</sl-group>`
  );
}