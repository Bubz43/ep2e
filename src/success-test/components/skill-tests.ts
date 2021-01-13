import type { ActorEP, MaybeToken } from '@src/entities/actor/actor';
import type { Ego } from '@src/entities/actor/ego';
import type { Character } from '@src/entities/actor/proxies/character';
import type { Skill } from '@src/features/skills';
import { overlay } from '@src/init';
import { writable } from 'svelte/store';
import SkillTests from './SkillTests.svelte';

export type SkillTestInit = {
  skill: Skill;
  entities: { actor: ActorEP; token?: MaybeToken };
  getSource: (actor: ActorEP) => { ego: Ego; character?: Character } | null;
};
export const activeSkillTests = writable(new Map<ActorEP, SkillTestInit>());

let skillTests: SkillTests | null = null;

activeSkillTests.subscribe((map) => {
  console.log(map);
  if (map.size && !skillTests) {
    skillTests = new SkillTests({ target: overlay });
  } else if (!map.size) {
    skillTests?.$destroy();
    skillTests = null;
  }
});

export const startSkillTest = (init: SkillTestInit) => {
  activeSkillTests.update((map) => new Map(map.set(init.entities.actor, init)));
};
