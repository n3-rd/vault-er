<script lang="ts">
  import { authStore } from '$lib/auth-store'
  import Protected from '../components/protected.svelte'
  import Dashboard from '../components/dashboard.svelte'
  import LoginForm from '../components/login-form.svelte'
</script>

{#if $authStore.loading}
  <div>Loading...</div>
{:else if $authStore.client}
  <Protected>
    <Dashboard />
  </Protected>
{:else}
  <LoginForm />
{/if}