<script lang="ts">
  import DashboardHeader from '$lib/components/dashboard/dashboard-header.svelte';
  import Spaces from '$lib/components/dashboard/spaces.svelte';
</script>

<div class="flex flex-col gap-8">
  <DashboardHeader 
    title="Vault-er Dashboard" 
    subtitle="Secure decentralized file sharing" 
  />

  <Spaces />
</div>
