import { literal, union } from '@badrap/valita';
import { enumValues } from '@src/data-enums';
import { createPipe, map } from 'remeda';

export const vEnum = createPipe(enumValues, map(literal), (parts) =>
  union(...parts),
);
