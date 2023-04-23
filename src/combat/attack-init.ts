import { AptitudeType } from '@src/data-enums';
import type { ActorEP, MaybeToken } from '@src/entities/actor/actor';
import { ActorType, ItemType } from '@src/entities/entity-types';
import { Explosive } from '@src/entities/item/proxies/explosive';
import { ThrownWeapon } from '@src/entities/item/proxies/thrown-weapon';
import type { FiringModeGroup } from '@src/features/firing-modes';
import {
  ActiveSkillCategory,
  FieldSkillType,
  setupFullFieldSkill,
  SkillType,
} from '@src/features/skills';
import { MeleeAttackControls } from '@src/success-test/components/melee-attack-controls/melee-attack-controls';
import { RangedAttackControls } from '@src/success-test/components/ranged-attack-controls/ranged-attack-controls';
import { ThrownAttackControls } from '@src/success-test/components/thrown-attack-controls/thrown-attack-controls';
import type { AttackType } from './attacks';

export const startMeleeAttack = ({
  actor,
  weaponId,
  token,
  attackType,
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
        primaryAttack: attackType !== 'secondary',
      };
    },
  });
};

export const startThrownAttack = ({
  actor,
  weaponId,
  token,
  attackType,
  adjacentElement,
}: {
  actor: ActorEP;
  weaponId: string;
  token?: MaybeToken;
  attackType?: AttackType;
  adjacentElement?: HTMLElement;
}) => {
  ThrownAttackControls.openWindow({
    entities: { token, actor },
    adjacentElement,
    getState: (actor) => {
      if (actor.proxy.type !== ActorType.Character) return null;
      const { ego } = actor.proxy;
      const weapon = actor.proxy.consumables.find((i) => i.id === weaponId);
      if (!(weapon instanceof Explosive || weapon instanceof ThrownWeapon))
        return null;
      return {
        ego,
        character: actor.proxy,
        token,
        weapon,
        primaryAttack: attackType !== 'secondary',

        skill:
          weapon.type === ItemType.ThrownWeapon && weapon.exoticSkillName
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
            : ego.getCommonSkill(SkillType.Athletics),
      };
    },
  });
};

export const startRangedAttack = ({
  actor,
  weaponId,
  token,
  attackType,
  adjacentElement,
  firingModeGroup,
}: {
  actor: ActorEP;
  weaponId: string;
  token?: MaybeToken;
  attackType?: AttackType;
  adjacentElement?: HTMLElement;
  firingModeGroup: FiringModeGroup;
}) => {
  RangedAttackControls.openWindow({
    entities: { token, actor },
    adjacentElement,
    getState: (actor) => {
      if (actor.proxy.type !== ActorType.Character) return null;
      const { ego } = actor.proxy;
      const weapon = actor.proxy.weapons.ranged.find((i) => i.id === weaponId);
      if (!weapon) return null;
      return {
        ego,
        character: actor.proxy,
        token,
        weapon,
        primaryAttack: attackType !== 'secondary',
        firingModeGroup,
        skill:
          weapon.type === ItemType.SprayWeapon && weapon?.exoticSkillName
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
            : ego.getCommonSkill(SkillType.Guns),
      };
    },
  });
};
