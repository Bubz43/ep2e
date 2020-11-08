import {
  renderSelectField,
  renderNumberField,
} from '@src/components/field/fields';
import { enumValues } from '@src/data-enums';
import type { FieldPropsRenderer } from '@src/utility/field-values';
import { Movement, MovementRate } from '../movement';

export const renderMovementRateFields: FieldPropsRenderer<MovementRate> = ({
  type,
  base,
  full,
}) => [
  renderSelectField(type, enumValues(Movement)),
  renderNumberField(base, { min: 1 }),
  renderNumberField(full, { min: 1 }),
];
