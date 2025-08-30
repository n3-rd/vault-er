<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import { logoutUser } from '$lib/auth';
  import { goto } from '$app/navigation';
  import { toast } from 'svelte-sonner';

  export let title: string = 'Dashboard';
  export let subtitle: string = 'Manage your resources';

  async function handleLogout() {
    try {
      logoutUser();
      toast.success('Logged out successfully');
      goto('/');
    } catch (error) {
      toast.error('Logout failed');
    }
  }
</script>

<div class="flex justify-between items-center mb-8">
  <div>
    <h1 class="text-4xl font-bold">{title}</h1>
    <p class="text-muted-foreground mt-2">{subtitle}</p>
  </div>
  <Button 
    onclick={handleLogout}
    variant="outline"
  >
    Logout
  </Button>
</div> 