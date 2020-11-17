import {
  Complexity,
  PhysicalWare,
  TraitSource,
  TraitType,
  SubstanceApplicationMethod,
  enumValues,
  DrugAddiction,
  DrugCategory,
  SubstanceType,
  SubstanceClassification,
  SleightType,
  SleightDuration,
  SoftwareType,
} from '@src/data-enums';
import { ActionType } from '@src/features/actions';
import { addFeature } from '@src/features/feature-helpers';
import { localize } from '@src/foundry/localization';
import type { GearCost } from '@src/foundry/template-schema';
import { notEmpty } from '@src/utility/helpers';
import { compact, groupBy } from 'remeda';
import { ItemType } from '../entity-types';
import { createItemEntity, ItemModels, ItemEntity } from '../models';

type SimpleTraitData = {
  name: string;
  type: 'Positive' | 'Negative';
  cost: number[];
  ego: boolean;
  morph: boolean;
  summary: string;
  description: string;
  resource: string;
};

const makeMeta = (label: string) => ({ label, entity: 'Item' });

const convertComplexity = (complexityGP: string | undefined): GearCost => {
  if (!complexityGP) return { complexity: Complexity.Minor, restricted: false };
  const parts = complexityGP.split('/');
  if (parts.length < 2)
    return { complexity: Complexity.Minor, restricted: false };
  const comp = parts[0] as 'Min' | 'Mod' | 'Maj' | 'Rare';
  const restricted = parts[1] === 'R';
  switch (comp) {
    case 'Maj':
      return { complexity: Complexity.Major, restricted };
    case 'Min':
      return { complexity: Complexity.Minor, restricted };
    case 'Mod':
      return { complexity: Complexity.Moderate, restricted };
    case 'Rare':
      return { complexity: Complexity.Rare, restricted };
  }
};

const convertWareType = (wareTypes: string): PhysicalWare[] => {
  const types = wareTypes.split('') as ('B' | 'C' | 'H' | 'N')[];
  return types.map((type) => {
    switch (type) {
      case 'B':
        return PhysicalWare.Bio;
      case 'C':
        return PhysicalWare.Cyber;
      case 'H':
        return PhysicalWare.Hard;
      case 'N':
        return PhysicalWare.Nano;
    }
  });
};

const trait = async (data: SimpleTraitData[]) => {
  const entityDatas = data.flatMap(
    ({ name, type, cost, ego, morph, description, resource }) =>
      compact([ego && TraitSource.Ego, morph && TraitSource.Morph]).map(
        (source) =>
          createItemEntity({
            name,
            type: ItemType.Trait,
            data: {
              traitType: TraitType[type],
              description,
              reference: resource,
              source,
              levels: cost.reduce(
                (accum, c) => addFeature(accum, { cost: c, effects: [] }),
                [] as ItemModels[ItemType.Trait]['levels'],
              ),
            },
          }),
      ),
  );
  const traitPack = await Compendium.create(makeMeta('Traits'));
  if (traitPack) return traitPack.createEntity(entityDatas);
};

type SimpleSubstanceData = {
  category: 'Drugs';
  subcategory: string;
  name: string;
  type: 'Biochem' | 'Nano' | 'Electronic';
  application: 'Any' | string;
  description: string;
  resource: string;
  addiction: string;
  'complexity/gp': string;
  duration: string;
};

const convertSubstanceApplication = (
  application: string,
): SubstanceApplicationMethod[] => {
  if (application === 'Any') return [...enumValues(SubstanceApplicationMethod)];
  if (application === 'App') return [];
  const parts = application.split(', ') as ('Inj' | 'O' | 'D' | 'Inh')[];
  return parts.map((part) => {
    switch (part) {
      case 'D':
        return SubstanceApplicationMethod.Dermal;
      case 'Inh':
        return SubstanceApplicationMethod.Inhalation;
      case 'Inj':
        return SubstanceApplicationMethod.Injected;
      case 'O':
        return SubstanceApplicationMethod.Oral;
    }
  });
};

const convertAddiction = (
  addiction: string,
): Pick<ItemModels[ItemType.Substance], 'addiction' | 'addictionMod'> => {
  const parts = addiction.split('/');
  if (parts.length === 1) return { addiction: '', addictionMod: 0 };
  const addictionMod = Number(parts[0]) || 0;
  const addictionType = parts[1] as 'Mental' | 'Physical';
  return { addiction: DrugAddiction[addictionType], addictionMod };
};

const toxinRegExp = /toxin/i;

const drugCategories = enumValues(DrugCategory).map(
  (category) => new RegExp(category, 'i'),
);

const convertToSubstance = ({
  name,
  subcategory,
  type,
  description,
  application,
  category,
  resource,
  addiction,
  duration,
  ...additional
}: SimpleSubstanceData) => {
  const finalCategory = drugCategories.find((catRegexp) =>
    catRegexp.test(subcategory),
  );
  return createItemEntity({
    name,
    type: ItemType.Substance,
    data: {
      substanceType: toxinRegExp.test(subcategory)
        ? SubstanceType.Toxin
        : SubstanceType.Drug,
      category: finalCategory
        ? localize(finalCategory.source as DrugCategory)
        : '',
      classification: SubstanceClassification[type],
      description,
      reference: resource,
      application: convertSubstanceApplication(application),
      ...convertAddiction(addiction),
      ...convertComplexity(additional['complexity/gp']),
    },
  });
};

const substance = async (data: SimpleSubstanceData[]) => {
  const drugsPack = await Compendium.create(makeMeta('Drugs'));
  const toxinsPack = await Compendium.create(makeMeta('Toxins'));
  if (drugsPack && toxinsPack) {
    const entityDatas = data.map(convertToSubstance);
    const substanceTypeGrouped = groupBy(
      entityDatas,
      (entity) => entity.data.substanceType,
    );
    await drugsPack.createEntity(substanceTypeGrouped[SubstanceType.Drug]);
    await toxinsPack.createEntity(substanceTypeGrouped[SubstanceType.Toxin]);
  }
};

type SimpleMeleeData = {
  category: 'Melee Weapons';
  subcategory: 'Melee Ware' | 'Melee Weapons' | 'Improvised Melee';
  name: string;
  waretype?: string;
  damage: string;
  'complexity/gp'?: string;
  description: string | null;
  resource: string;
  notes: string;
};

const unarmedRegExp = /unarmed/i;

const melee = async (meleeData: SimpleMeleeData[]) => {
  const pack = await Compendium.create(makeMeta('Melee Weapons'));
  if (pack) {
    const entityDatas = meleeData.flatMap(
      ({
        name,
        subcategory,
        waretype,
        damage,
        description,
        resource,
        notes,
        ...additional
      }) => {
        const [touchOnly, concealable, twoHanded] = [
          'Touch-Only',
          'Concealable',
          'Two-Handed',
        ].map((trait) => notes.includes(trait));
        const complexity = convertComplexity(additional['complexity/gp']);
        const augmentUnarmed = unarmedRegExp.test(damage);
        const improvised = subcategory === 'Improvised Melee';
        const ware = (waretype ? convertWareType(waretype) : ['']) as (
          | PhysicalWare
          | ''
        )[];
        return ware.map((wareType) => {
          return createItemEntity({
            name,
            type: ItemType.MeleeWeapon,
            data: {
              description: description || '',
              reference: resource,
              wareType,
              ...complexity,
              augmentUnarmed,
              improvised,
              touchOnly,
              concealable,
              twoHanded,
            },
          });
        });
      },
    );
    return pack.createEntity(entityDatas);
  }
};

type SimpleSleightData = {
  name: string;
  description: string;
  level: 'Chi' | 'Gamma' | 'Epsilon';
  resource: string;
  action: 'Complex' | 'Task' | 'Automatic';
  duration:
    | 'Instant'
    | 'Sustained'
    | 'Action Turns'
    | 'Hours'
    | 'Minutes'
    | 'Constant';
  modifier: number | string;
};

const sleight = async (data: SimpleSleightData[]) => {
  const epsilonPack = await Compendium.create(makeMeta('Psi-Epsilon Sleights'));
  const commonPack = await Compendium.create(makeMeta('Sleights'));
  if (epsilonPack && commonPack) {
    const epsilon: ItemEntity<ItemType.Sleight>[] = [];
    const common: ItemEntity<ItemType.Sleight>[] = [];
    for (const {
      name,
      description,
      level,
      resource,
      action,
      duration,
      modifier,
    } of data) {
      const sleightType = SleightType[level];
      const pack = sleightType === SleightType.Epsilon ? epsilon : common;
      pack.push(
        createItemEntity({
          name,
          type: ItemType.Sleight,
          data: {
            description,
            sleightType: SleightType[level],
            infectionMod: typeof modifier === 'number' ? modifier : 0,
            reference: resource,
            action: ActionType[action],
            duration:
              duration === 'Action Turns'
                ? SleightDuration.ActionTurns
                : SleightDuration[duration],
          },
        }),
      );
    }
    epsilonPack.configure({ private: true });
    await epsilonPack.createEntity(epsilon);
    await commonPack.createEntity(common);
  }
};

type SimpleArmorData = {
  name: string;
  description: string;
  subcategory: 'Armor Mods' | 'Armor Ware' | 'Armor Gear';
  waretype?: string;
  stackable?: boolean;
  energy: string | number;
  kinetic: string | number;
  'complexity/gp': string;
  resource: string;
  notes: string;
};

const armor = async (armorData: SimpleArmorData[]) => {
  const pack = await Compendium.create(makeMeta('Armor'));
  if (pack) {
    const armors = armorData.flatMap(
      ({
        name,
        subcategory,
        waretype,
        description,
        resource,
        energy,
        kinetic,
        stackable = false,
        ...additional
      }) => {
        if (subcategory === 'Armor Mods' || name.includes('Crash Suit'))
          return [];
        const ware = (waretype ? convertWareType(waretype) : ['']) as (
          | PhysicalWare
          | ''
        )[];
        const complexity = convertComplexity(additional['complexity/gp']);
        const armorValues = {
          energy: Number(energy) || 0,
          kinetic: Number(kinetic) || 0,
          layerable: stackable,
          concealable: false,
        };
        return ware.map((wareType) =>
          createItemEntity({
            name,
            type: ItemType.Armor,
            data: {
              ...complexity,
              armorValues,
              reference: resource,
              description,
              wareType,
            },
          }),
        );
      },
    );
    const [crashSuitActive, crashSuitInactive] = armorData.filter((data) =>
      data.name.includes('Crash Suit'),
    );
    if (crashSuitActive && crashSuitInactive) {
      armors.push(
        createItemEntity({
          name: 'Crash Suit',
          type: ItemType.Armor,
          data: {
            description: crashSuitActive.description,
            complexity: Complexity.Minor,
            reference: crashSuitActive.resource,
            hasActiveState: true,
            armorValues: {
              energy: Number(crashSuitInactive.energy),
              kinetic: Number(crashSuitInactive.energy),
              layerable: false,
              concealable: true,
            },
            activeArmor: {
              energy: Number(crashSuitActive.energy),
              kinetic: Number(crashSuitActive.kinetic),
              layerable: false,
              concealable: false,
            },
          },
        }),
      );
    }

    return pack.createEntity(armors);
  }
};

type SimpleTechData = {
  subcategory: string;
  name: string;
  'complexity/gp': string;
  description: string;
  resource: string;
  meshware?: boolean;
} & Partial<Record<PhysicalWare, boolean>>;

const tech = async (techData: SimpleTechData[], packName: string) => {
  const pack = await Compendium.create(makeMeta(packName));
  if (pack) {
    const gear = techData.flatMap(
      ({
        name,
        meshware,
        subcategory,
        description,
        resource: reference,
        ...additional
      }) => {
        const gearTypes: (
          | ItemEntity<ItemType.PhysicalTech>
          | ItemEntity<ItemType.Software>
          | ItemEntity<ItemType.Substance>
        )[] = [];
        const complexity = convertComplexity(additional['complexity/gp']);
        if (subcategory === 'Chemicals') {
          gearTypes.push(
            createItemEntity({
              name,
              type: ItemType.Substance,
              data: {
                ...complexity,
                description,
                reference,
                substanceType: SubstanceType.Chemical,
              },
            }),
          );
          return gearTypes;
        }
        if (meshware) {
          gearTypes.push(
            createItemEntity({
              name,
              type: ItemType.Software,
              data: {
                description,
                reference,
                softwareType: SoftwareType.Meshware,
                ...complexity,
                category: subcategory,
              },
            }),
          );
        }
        const wareTypes = enumValues(PhysicalWare).filter(
          (type) => !!additional[type],
        );
        if (notEmpty(wareTypes)) {
          for (const type of wareTypes) {
            gearTypes.push(
              createItemEntity({
                name,
                type: ItemType.PhysicalTech,
                data: {
                  description,
                  reference,
                  category: subcategory,
                  ...complexity,
                  wareType: type,
                },
              }),
            );
          }
        } else if (!meshware) {
          gearTypes.push(
            createItemEntity({
              name,
              type: ItemType.PhysicalTech,
              data: {
                description,
                reference,
                category: subcategory,
                ...complexity,
              },
            }),
          );
        }
        return gearTypes;
      },
    );
    return pack.createEntity(gear);
  }
};

type SimpleSoftwareOrService = {
  subcategory: 'Skillsoft' | 'Apps' | 'ALIs' | 'Scorchers' | 'TacNet';
  name: string;
  'complexity/gp': string;
  summary: string;
  description: string;
  resource: string;
};

const softwareOrService = async (
  softwareData: SimpleSoftwareOrService[],
  packName: string,
) => {
  const pack = await Compendium.create(makeMeta(packName));
  if (pack) {
    const entities = softwareData.flatMap((data) => {
      if (data.subcategory === 'ALIs') return [];
      const category = [...data.subcategory];
      if (data.subcategory.endsWith('s')) category.pop();
      return createItemEntity({
        name: data.name,
        type: ItemType.Software,
        data: {
          category: data.subcategory === 'Apps' ? '' : category.join(''),
          description: data.description,
          reference: data.resource,
          ...convertComplexity(data['complexity/gp']),
        },
      });
    });
    await pack.createEntity(entities);
  }
};

const jsonSource = (fileName: string) =>
  `https://raw.githubusercontent.com/Arokha/EP2-Data/master/${fileName}.json`;

export const createDefaultPacks = async () => {
  // const traitData = await (
  //   await fetch(jsonSource("traits"))
  // ).json();
  // const armorData = await (
  //   await fetch(jsonSource("gear_armor"))
  // ).json();

  // await trait(traitData);
  // await armor(armorData);
  // const sleightData = await (await fetch(jsonSource("sleights"))).json();
  const meleeData = await (await fetch(jsonSource('weapons_melee'))).json();
  const substanceData = await (await fetch(jsonSource('gear_drugs'))).json();
  const commsData = await (await fetch(jsonSource('gear_comms'))).json();
  const missionGear = await (await fetch(jsonSource('gear_mission'))).json();
  const nanoGear = await (await fetch(jsonSource('gear_nano'))).json();
  const securityGear = await (await fetch(jsonSource('gear_security'))).json();
  const wareData = await (await fetch(jsonSource('gear_ware'))).json();
  const itemsData = await (await fetch(jsonSource('gear_items'))).json();
  const software = await (await fetch(jsonSource('gear_software'))).json();
  const groupedItems = groupBy(
    itemsData,
    (data) => (data as { subcategory: 'Everyday' | 'Chemicals' }).subcategory,
  );
  // TODO: Software, Services
  // TODO: Bots, Creatures, Swarms, Vehicles, Morphs
  // await sleight(sleightData);
  // await melee(meleeData);

  // await substance(substanceData);
  // await tech(commsData, "Communications Gear");
  // await tech(missionGear, "Mission Gear");
  // await tech(nanoGear, "Nanotech");
  // await tech(securityGear, "Security Gear");
  // await tech(wareData, "Augmentations");
  // await tech(groupedItems["Everyday"] as SimpleTechData[], "Everyday Tech");
  // await tech(groupedItems["Chemicals"] as SimpleTechData[], "Chemicals");
  await softwareOrService(software as SimpleSoftwareOrService[], 'Software');
};
