import type { SlWindow } from '@src/components/window/window';
import { SlWindowEventName } from '@src/components/window/window-options';
import type { ActorEP } from '@src/entities/actor/actor';
import type { ActorDatas } from '@src/entities/models';
import type { Skill } from '@src/features/skills';
import { Component, createEffect, createMemo, createSignal, onCleanup, onMount, State } from 'solid-js';
import { traverseActiveElements } from 'weightless';
import type { TestInit } from './SkillTests';
import sn from "./style.module.css";

export const SkillTest: Component<{
  init: TestInit
  cleanup: () => void;
}> = (props) => {
  let win: SlWindow | undefined = undefined;

  const [actor, setActor] = createSignal(game.actors.get(props.init.actorId))

  const unsub = actor()?.subscribe(a => setActor(a))
  const cleanup = () => props.cleanup()

  onMount(() => {
    win?.addEventListener(SlWindowEventName.Closed, cleanup);
  });

  onCleanup(() => {
    win?.removeEventListener(SlWindowEventName.Closed, cleanup)
    unsub?.();
  })

  createEffect(() => {
    if (actor()) {
      const active = traverseActiveElements();
      if (active instanceof HTMLElement) win?.positionAdjacentToElement(active)
    }
  })

  createEffect(() => {
    if (!actor()) win?.remove();
  })

  return (
    <sl-window ref={win} name={actor()?.name ?? "actor"} noremove={true}>
      <section class={sn["container"]}>
          <mwc-button unelevated onClick={() => win?.close()}>
            {props.init.skill.name}
          </mwc-button>
      </section>
    </sl-window>
  );
};
