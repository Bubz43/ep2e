import * as v from '@badrap/valita';
import type { RequireExactlyOne } from 'type-fest';
import { createMessage, rollModeToVisibility } from './chat/create-message';
import type { DamageMessageData } from './chat/message-data';
import { AptitudeType } from './data-enums';
import { ActorType } from './entities/entity-types';
import { pickOrDefaultCharacter } from './entities/find-entities';
import { ArmorType } from './features/active-armor';
import { FieldSkillType, SkillType } from './features/skills';
import { NotificationType, notify } from './foundry/foundry-apps';
import { localize } from './foundry/localization';
import {
  isValidFormula,
  LabeledFormula,
  rollLabeledFormulas,
} from './foundry/rolls';
import { HealthType } from './health/health';
import { AptitudeCheckControls } from './success-test/components/aptitude-check-controls/aptitude-check-controls';
import { SkillTestControls } from './success-test/components/skill-test-controls/skill-test-controls';
import { vEnum } from './utility/v-enum';

// ! Make sure to validate all passed in data

export type CustomAttackData = Pick<
  DamageMessageData,
  'source' | 'damageType' | 'armorUsed' | 'armorPiercing' | 'reduceAVbyDV'
> & {
  formulas: LabeledFormula[];
};

const attack = v.object({
  source: v.string().assert((v) => !!v.length, 'cannot be empty'),
  damageType: vEnum(HealthType),
  armorUsed: v.array(vEnum(ArmorType)).optional(),
  armorPiercing: v.boolean().optional(),
  reduceAVbyDV: v.boolean().optional(),
  formulas: v.array(
    v.object({
      label: v.string(),
      formula: v.string().assert(isValidFormula),
    }),
  ),
});

const rollCustomAttack = (data: unknown) => {
  try {
    const {
      source,
      damageType,
      armorUsed,
      armorPiercing,
      reduceAVbyDV,
      formulas,
    } = attack.parse(data, { mode: 'strip' });
    const rolledFormulas = rollLabeledFormulas(formulas);
    createMessage({
      data: {
        header: { heading: source },
        damage: {
          damageType,
          source,
          armorUsed,
          armorPiercing,
          reduceAVbyDV,
          rolledFormulas,
        },
      },
      visibility: rollModeToVisibility(game.settings.get('core', 'rollMode')),
    });
  } catch (error) {
    notify(NotificationType.Error, `Invalid custom attack: ${error.message}`);
    console.log(error);
    return;
  }
};

export const successTestInitInfoSchema = v
  .object({
    aptitude: vEnum(AptitudeType).optional(),
    skillType: vEnum(SkillType).optional(),
    fieldSkill: v.object({
      type: vEnum(FieldSkillType),
      field: v
        .string()
        .assert((string) => string.trim().length > 0, 'Field cannot be empty'),
    }),
  })
  .assert(
    (test) => !!(test.aptitude || test.fieldSkill || test.skillType),
    'Must provide an aptitude, a skill, or a field skill',
  );

export type SuccessTestInitInfo = RequireExactlyOne<{
  aptitude: AptitudeType;
  skillType: SkillType;
  fieldSkill: {
    type: FieldSkillType;
    field: string;
  };
}>;

const startSuccessTest = (successTest: SuccessTestInitInfo) => {
  try {
    const test = successTestInitInfoSchema.parse(
      successTest,
    ) as SuccessTestInitInfo;
    if (successTest.aptitude) {
      pickOrDefaultCharacter((character) => {
        AptitudeCheckControls.openWindow({
          entities: { actor: character.actor },
          getState: (actor) => {
            if (actor.proxy.type !== ActorType.Character) return null;

            return {
              ego: actor.proxy.ego,
              character: actor.proxy,
              aptitude: AptitudeType.Willpower,
              // TODO halve:,
            };
          },
        });
      });
    } else if (successTest.skillType) {
      pickOrDefaultCharacter((character) => {
        SkillTestControls.openWindow({
          entities: { actor: character.actor },
          relativeEl: this,
          getState: (actor) => {
            if (actor.proxy.type !== ActorType.Character) return null;
            return {
              ego: actor.proxy.ego,
              character: actor.proxy,
              skill: actor.proxy.ego.getCommonSkill(successTest.skillType),
            };
          },
        });
      });
    } else if (successTest.fieldSkill) {
      pickOrDefaultCharacter((character) => {
        SkillTestControls.openWindow({
          entities: { actor: character.actor },
          relativeEl: this,
          getState: (actor) => {
            if (actor.proxy.type !== ActorType.Character) return null;
            const skill = actor.proxy.ego.findFieldSkill({
              fieldSkill: successTest.fieldSkill.type,
              field: successTest.fieldSkill.field,
            });
            if (!skill) {
              notify(
                NotificationType.Error,
                `Ego does not have ${localize(successTest.fieldSkill.type)}: ${
                  successTest.fieldSkill.field
                }`,
              );
              return null;
            }
            return {
              ego: actor.proxy.ego,
              character: actor.proxy,
              skill,
            };
          },
        });
      });
    }
  } catch (error) {
    notify(NotificationType.Error, `Invalid success test: ${error.message}`);
    console.log(error);
    return;
  }
};

window.ep2e = {
  rollCustomAttack,
  startSuccessTest,
};

declare global {
  interface Window {
    ep2e: {
      rollCustomAttack: typeof rollCustomAttack;
      startSuccessTest: typeof startSuccessTest;
    };
  }
}
