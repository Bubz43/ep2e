

<script lang="ts">
import { activeSkillTests } from "./skill-tests";
import type { SkillTestInit } from "./skill-tests"

  let testInit: SkillTestInit[] = [];
  $: testInit = [...$activeSkillTests.values()]
    
</script>

<svelte:options immutable={true} />

{#each testInit as skillTest, _ (skillTest)}
    <sl-window noremove name={skillTest.entities.actor.name}>Moop</sl-window>
{/each}



<style type="text/scss">
  @use "scss/functions" as *;
  @use "scss/mixins" as *;


     
</style>

