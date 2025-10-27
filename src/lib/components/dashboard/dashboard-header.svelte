<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import { logoutUser } from '$lib/auth';
  import { toast } from 'svelte-sonner';
  import NativeSurface from '$lib/components/native-surface.svelte';

  export let title: string = 'Dashboard';
  export let subtitle: string = 'Manage your resources';

  const handleLogout = async () => {
    try {
      await logoutUser();
      toast.success('Logged out successfully');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Failed to logout. Please try again.');
    }
  };

</script>

<NativeSurface class="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
  <div>
    <h1 class="text-2xl font-semibold text-black/85 dark:text-white/90">{title}</h1>
    {#if subtitle}
      <p class="text-sm text-black/60 dark:text-white/60">{subtitle}</p>
    {/if}
  </div>
  <Button
    onclick={handleLogout}
    variant="ghost"
    class="h-10 rounded-full border border-black/10 bg-white/70 px-4 text-sm font-semibold text-black hover:bg-white dark:border-white/20 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
  >
    Logout
  </Button>
</NativeSurface>
