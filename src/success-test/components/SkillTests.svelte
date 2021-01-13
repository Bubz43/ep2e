

<script lang="ts">
import { activeSkillTests } from "./skill-tests";
import type { SkillTestInit } from "./skill-tests"
import SkillTest from "./SkillTest.svelte";

  let tests: SkillTestInit[] = [];
  $: tests = [...$activeSkillTests.values()]

  function cleanupTest({ detail }: CustomEvent<SkillTestInit>) {
    activeSkillTests.update(map => {
      map.delete(detail.entities.actor)
      return new Map(map);
    })
  }
    
</script>

<svelte:options immutable={true} />

<div>{#each tests as testInit, _ (testInit.entities.actor)}
    <SkillTest {testInit} on:windowclosed={cleanupTest} />
{/each}

</div>

<style type="text/scss">
  @use "scss/functions" as *;
  @use "scss/mixins" as *;


     div {
       display: contents;
     }
</style>

