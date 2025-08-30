<script lang="ts">
  import ProtectedRoute from '$lib/components/auth/protected-route.svelte';

  export let children: () => any;
</script>

<ProtectedRoute {children} />