import { renderNumberField } from "@src/components/field/fields";
import { renderUpdaterForm } from "@src/components/form/forms";
import { enumValues, PoolType } from "@src/data-enums";
import type { UpdateActions } from "@src/entities/update-store";
import type { MorphPoolsData } from "@src/foundry/template-schema";

export const renderPoolEditForm = (poolUpdater: UpdateActions<MorphPoolsData>) => {
  return renderUpdaterForm(poolUpdater, {
    fields: (pools) =>
    enumValues(PoolType).map((type) =>
      type === PoolType.Threat
        ? ''
        : renderNumberField(pools[type], { min: 0 }),
    ),
  })
}