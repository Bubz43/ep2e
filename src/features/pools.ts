import type { PoolType } from '@src/data-enums';
import { localImage } from '@src/utility/images';

export const poolIcon = (type: PoolType) =>
  localImage(`images/icons/pools/${type}.png`);
