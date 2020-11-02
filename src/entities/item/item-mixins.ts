import { Complexity, enumValues, GearQuality, GearTrait, PhysicalWare } from '@src/data-enums';
import type { Class } from 'type-fest';

type HasEpData<T> = Class<{ epData: T}>

export const Purchasable = (
  cls: HasEpData<{
    quality: GearQuality;
    complexity: Complexity;
    restricted: boolean;
  }>,
) => {
  return class extends cls {
    get quality() {
      return this.epData.quality;
    }
    get cost() {
      const { complexity, restricted } = this.epData;
      return { complexity, restricted };
    }
  };
};

export const Equippable = (cls: HasEpData<{
  state: { equipped: boolean },
  wareType: PhysicalWare | ""
}>) => {
  return class extends cls {
    get equipped() {
      return this.epData.state.equipped
    }
    get wareType() {
      return this.epData.wareType
    }
    get isWare() {
      return !!this.wareType
    }
  }
}

export const Gear = (cls: HasEpData<Record<GearTrait, boolean>>) => class extends cls {
  get gearTraits() {
    return enumValues(GearTrait).filter((trait) => this.epData[trait]);
  }
 
}
