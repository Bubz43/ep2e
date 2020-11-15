import type { SubstanceAttackData } from '@src/combat/attacks';
import { StringID, stringID } from '@src/features/feature-helpers';
import type { PsiInfluenceData } from '@src/features/psi-influence';
import type { CommonEntityData, TokenData } from '@src/foundry/foundry-cont';
import type { EP } from '@src/foundry/system';
import type {
  EntityTemplates,
  AppliedSubstanceBase,
} from '@src/foundry/template-schema';
import type { UnionToIntersection, SetOptional } from 'type-fest';
import type { ActorType, sleeveTypes, ItemType } from './entity-types';

type EPEntity = keyof EntityTemplates;
type EntityTypeTemplates<T extends EPEntity> = EntityTemplates[T]['templates'];
type TemplateHolder<T extends EPEntity> = {
  templates: (keyof EntityTypeTemplates<T>)[];
};

type TemplateData<
  E extends EPEntity,
  T extends TemplateHolder<E>
> = T['templates'][number];

type TemplateParts<E extends EPEntity, T extends TemplateHolder<E>> = {
  [key in TemplateData<E, T>]: EntityTypeTemplates<E>[key];
};

type WithTemplates<
  E extends EPEntity,
  T extends TemplateHolder<E>
> = UnionToIntersection<TemplateParts<E, T>[TemplateData<E, T>]> &
  Omit<T, 'templates'>;

type ActorData<T extends ActorType> = WithTemplates<
  'Actor',
  EntityTemplates['Actor'][T]
>;

export type ActorModels = {
  readonly [key in ActorType]: ActorData<key>;
};

export type SleeveType = typeof sleeveTypes[number];

type ActorFlags<T extends ActorType> = T extends ActorType.Character
  ? {
      [ItemType.Psi]: ItemEntity<ItemType.Psi> | null;
      substancesAwaitingOnset: StringID<
        AppliedSubstanceBase & {
          onsetTime: number;
          elapsedOnset: number;
          items: DrugAppliedItem[];
          damage: SubstanceAttackData;
        }
      >[];
      // remoteControlling:
      //   | (ActorIdentifiers & { immersed?: boolean })
      //   | null;
    } & { [key in SleeveType]: ActorEntity<key> | null }
  : never;

export type ActorEntity<T extends ActorType = ActorType> = CommonEntityData & {
  type: T;
  data: ActorModels[T];
  token: SetOptional<Readonly<TokenData>, 'elevation' | '_id' | 'x' | 'y'>;
  flags: Readonly<{ [EP.Name]?: Readonly<Partial<ActorFlags<T>>> }>;
  items: readonly ItemDatas[];
  effects: unknown[];
};

export type ActorDatas = {
  [key in ActorType]: ActorEntity<key>;
}[ActorType];

export const createActorEntity = <T extends ActorType>({
  name,
  type,
  data,
  ...seed
}: Partial<Omit<ActorEntity<T>, 'data'>> & {
  type: T;
  name: string;
  data?: Partial<ActorEntity<T>['data']>;
}): ActorEntity<T> => {
  const modelData = mergeObject(game.system.model.Actor[type], data || {}, {
    inplace: false,
  });
  const _id = stringID(16);
  return {
    name,
    type,
    img: CONST.DEFAULT_TOKEN,
    permission: { default: CONST.ENTITY_PERMISSIONS.OWNER },
    _id,
    data: modelData,
    flags: {},
    items: [],
    effects: [],
    token: {
      flags: {},
      name,
      displayName: CONST.TOKEN_DISPLAY_MODES.NONE,
      img: CONST.DEFAULT_TOKEN,
      tint: null,
      width: 1,
      height: 1,
      scale: 1,
      mirrorX: false,
      mirrorY: false,
      lockRotation: false,
      rotation: 0,
      vision: false,
      dimSight: 0,
      brightSight: 0,
      dimLight: 0,
      brightLight: 0,
      sightAngle: 360,
      lightAngle: 360,
      lightColor: '',
      lightAlpha: 1,
      actorId: _id,
      actorLink: false,
      actorData: {},
      disposition: CONST.TOKEN_DISPOSITIONS.HOSTILE,
      displayBars: CONST.TOKEN_DISPLAY_MODES.NONE,
      randomImg: false,
      bar1: { attribute: '' },
      bar2: { attribute: '' },
    },
    ...seed,
  };
};

export const createItemEntity = <T extends ItemType>({
  name,
  type,
  data,
  ...seed
}: Partial<Omit<ItemEntity<T>, 'data'>> & {
  type: T;
  name: string;
  data?: Partial<ItemEntity<T>['data']>;
}): ItemEntity<T> => {
  const modelData = mergeObject(game.system.model.Item[type], data || {}, {
    inplace: false,
  });
  return {
    name,
    type,
    _id: stringID(16),
    data: modelData,
    img: CONST.DEFAULT_TOKEN,
    permission: { default: CONST.ENTITY_PERMISSIONS.OWNER },
    flags: {},
    ...seed,
  };
};

type ItemData<T extends ItemType> = WithTemplates<
  'Item',
  EntityTemplates['Item'][T]
>;

type ItemFlags<T extends ItemType> = T extends ItemType.Psi
  ? { influences: readonly StringID<PsiInfluenceData>[] }
  : T extends ItemType.Substance
  ? SubstanceItemFlags
  : T extends ItemType.Explosive
  ? { substance: null | [ItemEntity<ItemType.Substance>] }
  : T extends ItemType.MeleeWeapon
  ? {
      coating: null | [ItemEntity<ItemType.Substance>];
      payload: null | [ItemEntity<ItemType.Explosive>];
    }
  : T extends ItemType.PhysicalTech
  ? {
      software: ItemEntity<ItemType.Software>[];
      fabrication: {
        printTime: number;
        elapsed: number;
      };
    }
  : T extends ItemType.Sleight
  ? { temporary: boolean }
  : T extends ItemType.Trait
  ? { temporary: boolean }
  : T extends ItemType.Firearm
  ? {
      specialAmmo: ItemEntity<ItemType.FirearmAmmo> | null;
      shapes: ItemEntity<ItemType.Firearm>[];
    }
  : T extends ItemType.Railgun
  ? { shapes: ItemEntity<ItemType.Railgun>[] }
  : T extends ItemType.FirearmAmmo
  ? { payload: ItemEntity<ItemType.Substance> | null }
  : T extends ItemType.SprayWeapon
  ? { payload: ItemEntity<ItemType.Substance> | null }
  : T extends ItemType.ThrownWeapon
  ? { coating: [ItemEntity<ItemType.Substance>] | null }
  : T extends ItemType.SeekerWeapon
  ? { missiles: ItemEntity<ItemType.Explosive> | null }
  : never;

export type DrugAppliedItem =
  | ItemEntity<ItemType.Sleight>
  | ItemEntity<ItemType.Trait>;

export type SubstanceItemFlags = {
  alwaysAppliedItems: DrugAppliedItem[];
  severityAppliedItems: DrugAppliedItem[];
};

export type ItemModels = {
  [key in ItemType]: ItemData<key>;
};

export type ItemEntity<T extends ItemType = ItemType> = Readonly<
  CommonEntityData & {
    type: T;
    data: ItemModels[T];
    flags: Readonly<{ [EP.Name]?: Readonly<Partial<ItemFlags<T>>> }>;
  }
>;

export type ItemDatas = {
  [key in ItemType]: ItemEntity<key>;
}[ItemType];

export type NonEditableProps = 'type' | '_id';
