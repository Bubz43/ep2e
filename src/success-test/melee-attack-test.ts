import type { MeleeWeapon } from "@src/entities/item/proxies/melee-weapon";
import { SkillTest, SkillTestInit } from "./skill-test";

export type MeleeAttackTestInit = SkillTestInit & {
    meleeWeapon?: MeleeWeapon;
}

export class MeleeAttackTest extends SkillTest {
    constructor({meleeWeapon, ...init }: MeleeAttackTestInit) {
        super(init);
    }
}