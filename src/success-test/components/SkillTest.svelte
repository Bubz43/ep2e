<script lang="ts">
import type { SlWindow } from '@src/components/window/window';

  import { createEventDispatcher, onMount } from 'svelte';
import { traverseActiveElements } from 'weightless';

  import type { SkillTestInit } from './skill-tests';

  export let testInit: SkillTestInit;

  let win: SlWindow

  $: {
      if (win && testInit) {
          console.log(testInit.entities.actor)
          const active = traverseActiveElements()
          if (active instanceof HTMLElement) {
              win.positionAdjacentToElement(active)
          }
      }
  }

  onMount(() => {
      console.log("moop")
  })

  const dispatch = createEventDispatcher<{ windowclosed: SkillTestInit }>();

  function requestCleanup() {
    dispatch('windowclosed', testInit);
  }
</script>

<svelte:options immutable={true} />


<sl-window
bind:this={win}
  on:sl-window-closed={requestCleanup}
  noremove
  name={testInit.entities.actor.name}>
  <p>{testInit.skill.name}</p>
</sl-window>


<style type="text/scss">
  @use "scss/functions" as *;
  @use "scss/mixins" as *;
</style>

