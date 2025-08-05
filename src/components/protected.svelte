<script lang="ts">
 import { authStore } from '$lib/auth-store'
    
    export let children: any
  </script>
  
  {#if $authStore.loading}
    <div>Loading...</div>
  {:else if !$authStore.client}
    <div class="text-green-400 text-7xl"></div>
  {:else}
    {@render children()}
  {/if}