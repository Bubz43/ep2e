<script lang="ts">
import type { SlWindow } from '@src/components/window/window';

  import { AptitudeType, enumValues } from '@src/data-enums';
  import { ActionSubtype, ActionType } from '@src/features/actions';
  import { PreTestPoolAction } from '@src/features/pool';
  import { localize } from '@src/foundry/localization';
  import { notEmpty } from '@src/utility/helpers';
  import { equals } from 'remeda';

  import type { AptitudeCheck } from '../aptitude-check';




  export let check: AptitudeCheck;
  export let cleanup: () => void;
  export let close = false;

  let win: SlWindow;

  $: close && win.close()
</script>


<sl-window noremove={true} name="moop" on:sl-window-closed={cleanup} bind:this={win}>
  <div class="controls">
    <div class="sections">
      <section>
        <span class="vertical-text">{localize('check')}</span>
        <div class="aptitude-info">
          <sl-field label={localize('aptitude')}>
            <select bind:value={$check.state.aptitude}>
              {#each enumValues(AptitudeType) as type}
                <option value={type}>{localize(type)}</option>
              {/each}
            </select>
          </sl-field>
          <mwc-formfield label={localize('halve')}>
            <mwc-checkbox
              checked={$check.state.halve}
              on:change={({ currentTarget }) => $check.updateState({
                  halve: currentTarget.checked,
                })} />
          </mwc-formfield>
          <sl-group label={localize('total')}>{$check.aptitudeTotal}</sl-group>
        </div>
      </section>

      <section class="actions">
        <span class="vertical-text">{localize('action')}</span>

        <div class="wrapper"><sl-field label={localize('type')}>
            <select bind:value={$check.action.type}>
              {#each enumValues(ActionType) as type}
                <option value={type}>{localize(type)}</option>
              {/each}
            </select>
          </sl-field>
  
          <sl-field label={localize('subtype')}>
            <select bind:value={$check.action.subtype}>
              {#each enumValues(ActionSubtype) as subtype}
                <option value={subtype}>{localize(subtype)}</option>
              {/each}
            </select>
          </sl-field></div>
      </section>
      

      {#if notEmpty($check.pools)}
        <section class="pools">
          <span class="vertical-text">{localize('pools')}</span>
          <ul>
            {#each $check.pools as pool}
              <li class="pool">
                <pool-item disabled={!pool.available} {pool} />
                <div>
                  {#each enumValues(PreTestPoolAction) as action}
                    <button
                      disabled={!pool.available}
                      class:active={equals([pool, action], $check.activePool)}
                      on:click={() => $check.toggleActivePool([pool, action])}>
                      {localize('action')}</button>
                  {/each}
                </div>
              </li>
            {/each}
          </ul>
        </section>
      {/if}
    </div>
  </div>
</sl-window>

<style type="text/scss">
    @use "scss/functions" as *;
    @use "scss/mixins" as *;
  
    .controls {
      display: grid;
      grid-template-areas: 'sections modifiers' 'sections footer';
      grid-template-rows: 1fr auto;
      gap: 0.25rem;
      min-height: 300px;
      padding: 0.5rem 1rem;
  
      .sections {
        grid-area: sections;
      }
      // .modifiers {
      //   grid-area: modifiers;
      // }
      // footer {
      //   grid-area: footer;
      // }
      background: linear-gradient(
        to bottom,
        alphav(var(--color-bg), 0.8),
        alphav(var(--color-bg-alt), 0.8)
      );
    }
  
    .sections {
      display: grid;
      gap: 0.25rem;
      > * {
        display: flex;
        border: 1px solid var(--color-border);
        > *:not(.vertical-text) {
          align-self: center;
        }
      }
    }
  
    .aptitude-info {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      place-items: center;
      flex: 1;
  
      sl-field {
        width: 100%;
      }
    }
  
    .actions {
      .wrapper {
        flex: 1;
        display: grid;
        grid-template-columns: 1fr 1fr;
      }
    }
  
    .pools {
      ul {
        margin: 0;
        padding: 0 0.25rem;
        list-style: none;
        display: grid;
        grid-template-columns: 200px 200px;
        align-items: center;
        position: relative;
      }
    }
    .pool {
      display: flex;
      align-items: center;
      pool-item {
        pointer-events: none;
        flex: 1;
        padding: 0 0.25rem;
      }
  
      div {
        display: grid;
        align-items: center;
      }
  
      @include textButton();
  
      button {
        padding: 0 0.5rem;
        justify-content: center;
        text-align: center;
        &.active {
          box-shadow: 0 0 1px 2px var(--color-secondary) inset;
        }
      }
    }
    .vertical-text {
    text-transform: uppercase;
    writing-mode: vertical-lr;
    text-orientation: upright;
    letter-spacing: -0.25rem;
    padding: 0.25rem 0.35rem 0.5rem;
    font-size: small;
    width: min-content;
    border-right: 1px solid var(--color-border);
    background: var(--color-bg);
    text-align: center;
  }
  </style>
  