<script lang="ts">
	import '../app.css';
	import { Toaster } from "$lib/components/ui/sonner/index.js";
	
	let { children } = $props();
</script>
<Toaster />
<div class="container mx-auto py-8">
	{@render children()}
</div>
