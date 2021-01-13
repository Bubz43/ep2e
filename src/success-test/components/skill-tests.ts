import type { ActorEP, MaybeToken } from "@src/entities/actor/actor";
import type { Ego } from "@src/entities/actor/ego";
import type { Character } from "@src/entities/actor/proxies/character";
import type { Skill } from "@src/features/skills";
import { overlay } from "@src/init";
import { writable } from "svelte/store";
import SkillTests from "./SkillTest.svelte"

export type SkillTestInit = {
    skill: Skill;
    entities: { actor: ActorEP, token?: MaybeToken},
    getSource: (actor: ActorEP) => { ego: Ego, character?: Character } | null
}
export const activeSkillTests = writable(new Map<ActorEP, SkillTestInit>())

activeSkillTests.subscribe(map => console.log(map), () => {
    const skillTest = new SkillTests({ target: overlay })
    console.log("got sub")
    return () => {
        console.log("no subs")
        skillTest.$destroy();
    }
})

export const startSkillTest = (init: SkillTestInit) => {
    activeSkillTests.update(map => map.set(init.entities.actor, init))
}