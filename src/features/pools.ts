import type { PoolType } from '@src/data-enums';
import { localImage } from '@src/utility/images';

export const poolIcon = (type: PoolType) =>
  localImage(`icons/pools/${type}.png`);
