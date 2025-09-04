<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';
  import { toast } from 'svelte-sonner';
  import { goto } from '$app/navigation';
  import { login } from '$lib/auth';
  import Shape1 from '$lib/components/shapes/shape1.svelte';

  let email = '';
  let isLoading = false;

  async function handleSubmit() {
    isLoading = true;
    try {
      await login(email);
      toast.success('Login successful');
      goto('/');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Login failed');
    } finally {
      isLoading = false;
    }
  }
</script>

<div class="h-[85vh] w-screen flex items-center justify-center relative px-4 sm:px-6 lg:px-8">
  <Shape1 className="absolute -top-12 -right-12 spin-slow" color="#D0BCFF" height={200} width={200} />
  <div class="w-full max-w-md lg:max-w-lg xl:max-w-xl space-y-6">
    <div class="flex flex-col gap-6 w-full">
      <h1 class="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold uppercase">Secure <span class="text-primary">decentralized</span> <br/> file sharing</h1>
      <p class="text-base sm:text-lg lg:text-xl text-muted-foreground">
        Share files with friends and family securely and privately.
      </p>
    </div>

    <form on:submit|preventDefault={handleSubmit} class="space-y-4 sm:space-y-6">
      <div>
        <Label htmlFor="email" className="text-sm sm:text-base">Email</Label>
        <Input 
          id="email" 
          type="email" 
          bind:value={email} 
          placeholder="Enter your email" 
          required 
          class="h-10 sm:h-12 text-sm sm:text-base"
        />
      </div>
      
      <Button type="submit" disabled={isLoading} class="w-full h-10 sm:h-12 text-sm sm:text-base">
        {isLoading ? 'Logging in...' : 'Login'}
      </Button>
    </form>
  </div>
</div>