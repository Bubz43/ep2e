import * as v from '@badrap/valita';
import type { RequireExactlyOne } from 'type-fest';
import { createMessage, rollModeToVisibility } from './chat/create-message';
import type { DamageMessageData } from './chat/message-data';
import { lastClickedEl } from './components/window/window-controls';
import { AptitudeType } from './data-enums';
import { ActorType } from './entities/entity-types';
import { pickOrDefaultCharacter } from './entities/find-entities';
import { ArmorType } from './features/active-armor';
import { FieldSkillType, SkillType } from './features/skills';
import { DropType, isKnownDrop } from './foundry/drag-and-drop';
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
    fieldSkill: v
      .object({
        type: vEnum(FieldSkillType),
        field: v
          .string()
          .assert(
            (string) => string.trim().length > 0,
            'Field cannot be empty',
          ),
      })
      .optional(),
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
  let last = lastClickedEl;
  if (last instanceof HTMLCanvasElement) last = null;
  const relativeEl = last || document.getElementById('action-bar') || undefined;
  try {
    const test = successTestInitInfoSchema.parse(
      successTest,
    ) as SuccessTestInitInfo;
    if (test.aptitude) {
      pickOrDefaultCharacter((character) => {
        AptitudeCheckControls.openWindow({
          entities: { actor: character.actor },
          relativeEl: relativeEl,
          getState: (actor) => {
            if (actor.proxy.type !== ActorType.Character) return null;

            return {
              ego: actor.proxy.ego,
              character: actor.proxy,
              aptitude: test.aptitude,
              // TODO halve:,
            };
          },
        });
      });
    } else if (test.skillType) {
      pickOrDefaultCharacter((character) => {
        SkillTestControls.openWindow({
          entities: { actor: character.actor },
          relativeEl: relativeEl,
          getState: (actor) => {
            if (actor.proxy.type !== ActorType.Character) return null;
            return {
              ego: actor.proxy.ego,
              character: actor.proxy,
              skill: actor.proxy.ego.getCommonSkill(test.skillType),
            };
          },
        });
      });
    } else if (test.fieldSkill) {
      pickOrDefaultCharacter((character) => {
        const skill = character.ego.findFieldSkill({
          fieldSkill: test.fieldSkill.type,
          field: test.fieldSkill.field,
        });
        if (!skill) {
          notify(
            NotificationType.Error,
            `${character.name} does not have ${localize(
              test.fieldSkill.type,
            )}: ${test.fieldSkill.field}`,
          );
          return;
        }
        SkillTestControls.openWindow({
          entities: { actor: character.actor },
          relativeEl: relativeEl,

          getState: (actor) => {
            if (actor.proxy.type !== ActorType.Character) return null;

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

Hooks.on('hotbarDrop', async (hotbar: Hotbar, data: unknown, slot: number) => {
  if (isKnownDrop(data) && data.type === DropType.SuccessTestInfo) {
    const { successTest } = data;
    const command = `window.ep2e.startSuccessTest(${JSON.stringify(
      successTest,
    )})`;
    const name = successTest.aptitude
      ? `${localize(successTest.aptitude)} ${localize('aptitudeCheck')}`
      : successTest.skillType
      ? `${localize(successTest.skillType)} ${localize('skillTest')}`
      : `${localize(successTest.fieldSkill.type)}: ${
          successTest.fieldSkill.field
        } ${localize('skillTest')}`;
    let macro = [...game.macros.values()].find(
      (m) => m.name === name && m.data.command === command,
    );
    if (!macro) {
      macro = (await Macro.create({
        name,
        type: 'script',
        command,
      })) as Macro;
    }
    game.user.assignHotbarMacro(macro, slot);
    return false;
  }
  return;
});

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
