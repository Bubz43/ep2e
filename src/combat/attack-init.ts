import { AptitudeType } from '@src/data-enums';
import type { ActorEP, MaybeToken } from '@src/entities/actor/actor';
import { ActorType } from '@src/entities/entity-types';
import {
  ActiveSkillCategory,
  FieldSkillType,
  setupFullFieldSkill,
  SkillType,
} from '@src/features/skills';
import { MeleeAttackControls } from '@src/success-test/components/melee-attack-controls/melee-attack-controls';
import type { AttackType } from './attacks';

export const startMeleeAttack = ({
  actor,
  weaponId,
  token,
  attackType = 'primary',
}: {
  actor: ActorEP;
  weaponId?: string;
  token?: MaybeToken;
  attackType?: AttackType;
}) => {
  MeleeAttackControls.openWindow({
    entities: { token, actor },
    getState: (actor) => {
      if (actor.proxy.type !== ActorType.Character) return null;
      const { ego, weapons } = actor.proxy;
      const weapon = weapons.melee.find((w) => w.id === weaponId);
      return {
        ego,
        character: actor.proxy,
        token,
        skill: weapon?.exoticSkillName
          ? ego.findFieldSkill({
              fieldSkill: FieldSkillType.Exotic,
              field: weapon.exoticSkillName,
            }) ||
            setupFullFieldSkill(
              {
                field: weapon.exoticSkillName,
                fieldSkill: FieldSkillType.Exotic,
                points: 0,
                linkedAptitude: AptitudeType.Somatics,
                specialization: '',
                category: ActiveSkillCategory.Combat,
              },
              ego.aptitudes,
            )
          : ego.getCommonSkill(SkillType.Melee),
        meleeWeapon: weapon,
        primaryAttack: attackType === 'primary',
      };
    },
  });
};
