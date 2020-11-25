import {
  MorphCost,
  Complexity,
  TraitType,
  TraitSource,
  SoftwareType,
  AptitudeType,
} from '@src/data-enums';
import { ActionSubtype } from '@src/features/actions';
import {
  createEffect,
  Effect,
  DurationEffectTarget,
} from '@src/features/effects';
import {
  uniqueStringID,
  stringID,
  StringID,
  addFeature,
} from '@src/features/feature-helpers';
import { TagType, SpecialTest } from '@src/features/tags';
import { localize } from '@src/foundry/localization';
import { range, pipe } from 'remeda';
import { ActorType, ItemType } from '../entity-types';
import { createActorEntity, createItemEntity } from '../models';
import type { Trait } from './proxies/trait';

const defaultReference = (pageNumber: number) =>
  `Eclipse Phase Second Editon p. ${pageNumber}`;

// TODO Eventually Replace these with refernces to compendium entries

export const createDefaultSleeve = () => {
  const uniqueIds = range(0, 3).reduce(
    (accum) => [...accum, uniqueStringID(accum)],
    [] as string[],
  );
  const sleeve = createActorEntity({
    type: ActorType.Infomorph,
    name: localize('digimorph'),
    data: {
      description: `<p>Digimorphs are bare-bones mind emulations, though customizable and widely
      used. By default, an ego that evacuates (or is forked from) a cyberbrain is run
      on a digimorph, unless another infomorph option is available.</p>`,
      reference: defaultReference(67),
      acquisition: {
        resource: MorphCost.MorphPoints,
        availability: 100,
        cost: 0,
        complexity: Complexity.Minor,
        restricted: false,
      },
      meshHealth: {
        ...game.system.model.Actor.infomorph.meshHealth,
        baseDurability: 25,
      },
    },
    items: [
      exoticMorphology(3),
      digitalSpeed(),
      mnemonicsWare(),
    ].map((item, index) => ({ ...item, _id: uniqueIds[index] })),
  });
  return sleeve;
};

const exoticMorphology = (level: 1 | 2 | 3) => {
  return createItemEntity({
    type: ItemType.Trait,
    name: localize('exoticMorphology'),
    data: {
      traitType: TraitType.Negative,
      source: TraitSource.Morph,
      restrictions: `May not be applied to morphs that don't come with it.`,
      description: `<p>This morph is substantially physiologically (and possibly neurologically) 
      different from the baseline humanoid forms most transhumans are accustomed to sleeving. 
      You receive a –10 modifier per level on Integration Tests ▶288 when sleeving into this morph. 
      This modifier does not apply to the original morph of uplift or infolife
      characters. This trait may not be applied to morphs that don’t come with it.</p>`,
      reference: defaultReference(78),
      levels: range(1, 4).map((lvl) => ({
        id: stringID(),
        cost: lvl,
        effects: [
          {
            id: stringID(),
            ...createEffect.successTest({
              modifier: -10 * lvl,
              requirement: 'not original morph type',
              tags: [{ type: TagType.Special, test: SpecialTest.Integration }],
            }),
          },
        ],
      })),
      state: {
        level,
        triggered: false,
      },
    },
  });
};

const enhancedBehavior = (subtype: string, level: number) => {
  const requirement = `Witheld from behavior/emotion`;
  const levels: Trait['levels'] = [
    {
      cost: 1,
      effects: pipe(
        [] as StringID<Effect>[],
        addFeature(
          createEffect.successTest({
            modifier: -10,
            requirement,
          }),
        ),
        addFeature(
          createEffect.misc({
            description: `You are encouraged to pursue the behavior and associate
            it with positive feelings; emotions are boosted.`,
          }),
        ),
      ),
      id: stringID(),
    },
  ];
  return createItemEntity({
    type: ItemType.Trait,
    name: localize('enhancedBehavior'),
    data: {
      traitType: TraitType.Negative,
      source: TraitSource.Ego,
      reference: defaultReference(78),
      subtype,
      state: { level, triggered: false },
      levels: pipe(
        levels,
        addFeature({
          cost: 2,
          effects: pipe(
            [] as StringID<Effect>[],
            addFeature(
              createEffect.successTest({
                modifier: -20,
                requirement,
              }),
            ),
            addFeature(
              createEffect.misc({
                description: `You are driven to engage in the specified behavior;
                emotions are exaggerated. Holding back requires a WIL Check.`,
              }),
            ),
          ),
        }),
        addFeature({
          cost: 4,
          effects: pipe(
            [] as StringID<Effect>[],
            addFeature(
              createEffect.successTest({
                modifier: -20,
                requirement,
              }),
            ),
            addFeature(
              createEffect.misc({
                description: `The behavior is enforced; emotions are compulsory
                and ongoing. If restrained from the conduct or the emotion is
                suppressed, suffer SV 1d6.`,
              }),
            ),
          ),
        }),
      ),
      description: `<p>Your conduct or moods are modified. This may be due to conditioning and reprogramming via time-accelerated psychosurgery ▶294,
      drugs, genetic tweaks, psi, or other factors. This may have been a
      deliberate choice or it may have been inflicted against your will. 
      This trait may be taken more than once for different behaviors.</p>`,
    },
  });
};

const realWorldNaivete = () => {
  return createItemEntity({
    name: localize('realWorldNaivete'),
    type: ItemType.Trait,
    data: {
      traitType: TraitType.Negative,
      source: TraitSource.Ego,
      reference: defaultReference(80),
      description: `<p>You either have very limited personal experience with the real
      (physical) world or have spent so much time in VR that your real-life
      functioning is impaired. You lack an understanding of many physical properties, social cues, and other factors that most people take
      for granted. This lack of common sense may lead you to misunderstand how a device works or misinterpret someone’s body language.
      Once per game session, the GM may intentionally mislead you
      when providing a description about some thing or social interaction.
      This falsehood represents your misunderstanding of the situation
      and should be roleplayed appropriately, even when the player is
      aware of the character’s mistake.</p>`,
      levels: [
        {
          id: stringID(),
          cost: 2,
          effects: [
            {
              id: stringID(),
              ...createEffect.misc({
                description: `Once per game session, the GM may intentionally mislead you
                when providing a description about some thing or social interaction.`,
              }),
            },
          ],
        },
      ],
    },
  });
};

const digitalSpeed = () => {
  return createItemEntity({
    type: ItemType.Trait,
    name: localize('digitalSpeed'),
    data: {
      traitType: TraitType.Positive,
      source: TraitSource.Morph,
      description: `<p>This trait is only available to infomorphs. Unfettered by the physical,
      you reduce timeframes for mesh-based task actions by 25%; this is
      cumulative with reduced time from superior successes.</p>`,
      reference: defaultReference(73),
      levels: [
        {
          id: stringID(),
          cost: 1,
          effects: [
            {
              ...createEffect.duration({
                subtype: DurationEffectTarget.TaskActionTimeframe,
                modifier: -25,
                taskType: ActionSubtype.Mesh,
              }),
              id: stringID(),
            },
          ],
        },
      ],
    },
  });
};

const mnemonicsWare = () => {
  return createItemEntity({
    type: ItemType.Software,
    name: localize('mnemonics'),
    data: {
      complexity: Complexity.Minor,
      restricted: false,
      softwareType: SoftwareType.Meshware,
      description: `<p>The electronic minds of cyberbrains and infomorphs mimic biological brains in how they store memories — as
      networked but scattered groups of neurons. Despite being computerized, their memory recall is not any more efficient than bio brains.
      Mnemonics systems, however, allow memories to be tagged and
      roughly indexed. This improves memory recall, though it remains
      far from perfect. Mnemonics applies a +20 modifier to COG Checks
      for memory recall. Mnemonic data can be transferred with an
      ego when it resleeves, but the modifier applies only for memories
      that were recorded when mnemonics ware is present. Mnemonics
      systems are included in all cyberbrains.</p>`,
      state: {
        equipped: true,
        activated: false,
        serviceStartTime: 0,
        paused: false,
      },
      effects: [
        {
          id: stringID(),
          ...createEffect.successTest({
            modifier: 20,
            requirement: localize('memoryRelated'),
            tags: [
              {
                type: TagType.AptitudeChecks,
                aptitude: AptitudeType.Cognition,
              },
            ],
          }),
        },
      ],
    },
  });
};

export const createDefaultItem = {
  mnemonicsWare,
  realWorldNaivete,
  digitalSpeed,
  enhancedBehavior,
  exoticMorphology,
};
