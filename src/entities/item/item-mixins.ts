import {
  Complexity,
  enumValues,
  GearQuality,
  GearTrait,
  PhysicalWare,
  RangedWeaponAccessory,
  RangedWeaponTrait,
} from '@src/data-enums';
import { getElapsedTime } from '@src/features/time';
import type { BlueprintData } from '@src/foundry/template-schema';
import type { Class } from 'type-fest';
import type { UpdateActions } from '../update-store';

type HasEpData<T, E = {}> = Class<{ epData: T } & E>;

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

export const Equippable = (
  cls: HasEpData<
    {
      state: { equipped: boolean };
      wareType: PhysicalWare | '';
    },
    { updateState: UpdateActions<{ equipped: boolean }> }
  >,
) => {
  return class extends cls {
    get equipped() {
      return this.epData.state.equipped;
    }
    get wareType() {
      return this.epData.wareType;
    }
    get isWare() {
      return !!this.wareType;
    }
    toggleEquipped() {
      return this.updateState.commit({ equipped: !this.equipped });
    }
  };
};

export const Copyable = (cls: HasEpData<{ blueprint: BlueprintData }>) => {
  return class extends cls {
    get blueprintType() {
      return this.epData.blueprint.blueprintType;
    }

    get isBlueprint() {
      return !!this.blueprintType;
    }
  };
};

export const Gear = (cls: HasEpData<Record<GearTrait, boolean>>) => {
  return class extends cls {
    get gearTraits() {
      return enumValues(GearTrait).filter((trait) => this.epData[trait]);
    }
  };
};

export const Stackable = (
  cls: HasEpData<
    { quantity: number; state: { stashed: boolean } },
    { updateState: UpdateActions<{ stashed: boolean }> }
  >,
) => {
  return class extends cls {
    get quantity() {
      return this.epData.quantity;
    }
    get stashed() {
      return this.epData.state.stashed;
    }
    toggleStashed() {
      return this.updateState.commit({ stashed: !this.stashed });
    }
  };
};

export const RangedWeapon = (
  cls: HasEpData<
    {
      accessories: RangedWeaponAccessory[];
      state: { braced: boolean; interface: boolean };
    },
    {
      readonly weaponTraits: RangedWeaponTrait[];
      readonly gearTraits: GearTrait[];
    }
  >,
) => {
  return class extends cls {
    get accessories() {
      return this.epData.accessories;
    }
    get state() {
      return this.epData.state;
    }
    get braced() {
      return this.state.braced;
    }
    get useInterface() {
      return this.state.interface;
    }
    get magazineModifiers() {
      let extended = false;
      let smart = false;
      for (const accessory of this.accessories) {
        if (accessory === RangedWeaponAccessory.ExtendedMagazine)
          extended = true;
        else if (accessory === RangedWeaponAccessory.SmartMagazine)
          smart = true;
      }
      return { extended, smart, capacityChanged: extended !== smart };
    }

    get isFixed() {
      return this.weaponTraits.includes(RangedWeaponTrait.Fixed);
    }

    get isLong() {
      return this.weaponTraits.includes(RangedWeaponTrait.Long);
    }

    get noClose() {
      return this.weaponTraits.includes(RangedWeaponTrait.NoClose);
    }

    get noPointBlank() {
      return this.weaponTraits.includes(RangedWeaponTrait.NoPointBlank);
    }

    get isTwoHanded() {
      return (
        this.gearTraits.includes(GearTrait.TwoHanded) ||
        (this.isFixed && !this.braced)
      );
    }
  };
};

export const Service = (
  cls: HasEpData<{
    serviceDuration: number;
    state: { serviceStartTime: number };
  }>,
) => {
  return class extends cls {
    get serviceDuration() {
      return this.epData.serviceDuration;
    }
    get isIndefiniteService() {
      return this.serviceDuration < 0;
    }
    get elapsedDuration() {
      return getElapsedTime(this.epData.state.serviceStartTime);
    }
    get expirationProgress() {
      return this.elapsedDuration / this.serviceDuration;
    }

    get remainingDuration() {
      console.log(this.elapsedDuration, this.serviceDuration);
      return this.serviceDuration - this.elapsedDuration;
    }
    get isExpired() {
      return (
        !this.isIndefiniteService &&
        this.elapsedDuration >= this.serviceDuration
      );
    }
  };
};
