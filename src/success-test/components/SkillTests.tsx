import { SlWindowEventName } from '@src/components/window/window-options';
import type { ActorEP } from '@src/entities/actor/actor';
import type { Ego } from '@src/entities/actor/ego';
import type { ActorDatas } from '@src/entities/models';
import type { Skill } from '@src/features/skills';
import { overlay } from '@src/init';
import { omit } from 'remeda';
import {
  createMemo,
  createSignal,
  createState,
  For,
  produce,
  reconcile,
} from 'solid-js';
import { render } from 'solid-js/web';
import type { Entries } from 'type-fest';
import { SkillTest } from './SkillTest';

export type TestInit = {
  actorId: string;
  skill: Skill;
  getState: (actor: ActorEP) => { ego: Ego } | null;
};

const [skillTests, setSkillTests] = createState({
  tests: [] as TestInit[],
});

let addedSolid = false;

export const addSkillTest = (init: TestInit) => {
  const index = skillTests.tests.findIndex(({ actorId }) => actorId === init.actorId);
  if (index === -1)
    setSkillTests('tests', (list) => [
      ...list,
      {...init, skill: { ...init.skill }},
    ]);
    else setSkillTests("tests", index, () => ({ skill: {...init.skill}, }))
 

  if (!addedSolid) {
    const div = document.createElement('div');
    div.style.display = 'contents';
    overlay.append(div);
    const blah = render(SkillTests, div);
    addedSolid = true;
  }
};

const SkillTests = () => {
  return (
    <>
      <For each={skillTests.tests}>
        {(init) => (
          <SkillTest
            init={init}
            cleanup={() =>
              setSkillTests('tests', (list) =>
                list.filter((entry) => entry.actorId !== init.actorId),
              )
            }
          />
        )}
      </For>
    </>
  );
};
