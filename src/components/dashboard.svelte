<script lang="ts">
  import DashboardHeader from '$lib/components/dashboard/dashboard-header.svelte';
  import Spaces from '$lib/components/dashboard/spaces.svelte';
</script>

<div class="min-h-screen">
  <div>
    <DashboardHeader 
      title="Vault-er Dashboard" 
      subtitle="Secure decentralized file sharing" 
    />

    <div class="w-full">
      <Spaces />
    </div>
  </div>
</div>