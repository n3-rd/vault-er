<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';
  import { toast } from 'svelte-sonner';
  import { goto } from '$app/navigation';
  import { loginUser } from '$lib/auth';
  import Shape1 from '$lib/components/shapes/shape1.svelte';

  let email = '';
  let password = '';
  let isLoading = false;

  async function handleSubmit() {
    isLoading = true;
    try {
      await loginUser(email, password);
      toast.success('Login successful');
      goto('/dashboard');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Login failed');
    } finally {
      isLoading = false;
    }
  }
</script>

<div class="min-h-screen flex items-center justify-center relative">
  <Shape1 className="absolute -top-12 -right-12 spin-slow" color="#D0BCFF" height={200} width={200} />
  <div class="w-full max-w-md space-y-6">
    <div class="flex flex-col gap-6 max-w-md">
      <h1 class="text-4xl font-bold uppercase">Secure <span class="text-primary">decentralized</span> <br/> file sharing</h1>
      <p class="text-lg text-muted-foreground">
        Share files with friends and family securely and privately.
      </p>
    </div>

    <form on:submit|preventDefault={handleSubmit} class="space-y-4">
      <div>
        <Label htmlFor="email">Email</Label>
        <Input 
          id="email" 
          type="email" 
          bind:value={email} 
          placeholder="Enter your email" 
          required 
        />
      </div>
      
      <div>
        <Label htmlFor="password">Password</Label>
        <Input 
          id="password" 
          type="password" 
          bind:value={password} 
          placeholder="Enter your password" 
          required 
        />
      </div>
      
      <Button type="submit" disabled={isLoading} class="w-full">
        {isLoading ? 'Logging in...' : 'Login'}
      </Button>
    </form>
  </div>
</div>