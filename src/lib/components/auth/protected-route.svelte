<script lang="ts">
  import { goto } from '$app/navigation';
  import { authStore } from '$lib/auth-store';
  import { onMount } from 'svelte';
  import Spinner from '$lib/components/ui/spinner.svelte';

  export let children: () => any;
  export let redirectTo: string = '/';

  let isLoading = true;

  onMount(() => {
    const unsubscribe = authStore.subscribe(({ client, loading }) => {
      if (!loading && !client) {
        goto(redirectTo);
      }
      if (!loading) {
        isLoading = false;
      }
    });

    return unsubscribe;
  });
</script>

{#if isLoading}
  <div class="flex justify-center items-center min-h-screen">
    <Spinner />
  </div>
{:else}
  {@render children()}
{/if} 