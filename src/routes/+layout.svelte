<script lang="ts">
	import '../app.css';
	import { Toaster } from "$lib/components/ui/sonner/index.js";
	import { ModeWatcher } from "mode-watcher";
	
	let { children } = $props();
</script>
<ModeWatcher />
<Toaster />
<div class="min-h-screen bg-background">
	<div class="container mx-auto py-10 md:px-6">
		{@render children()}
	</div>
</div>
