<script lang="ts">
    import { login, authStore } from '$lib/auth-store'
    import Shape1 from '$lib/components/shapes/shape1.svelte';
    import { Button } from "$lib/components/ui/button/index";
    import { Input } from "$lib/components/ui/input/index";
  
    let email = ''
    let isSubmitting = false
  
    const handleSubmit = async () => {
      if (!email) return
      isSubmitting = true
      await login(email)
      isSubmitting = false
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
  
      {#if $authStore.emailSent}
        <div class="text-center space-y-4">
          <p>Check your email at <strong>{$authStore.emailSentTo}</strong></p>
          <p class="text-sm text-muted-foreground">
            We've sent you a magic link to sign in securely.
          </p>
          <Button onclick={() => authStore.update(s => ({ ...s, emailSent: false, emailSentTo: null }))}>
            Try different email
          </Button>
        </div>
      {:else}
        <form on:submit|preventDefault={handleSubmit} class="space-y-4">
          <div>
            <Input
              bind:value={email}
              type="email"
              placeholder="Enter your email"
              required
            />
          </div>
          <Button type="submit" disabled={isSubmitting} class="w-full">
            {isSubmitting ? 'Sending...' : 'Sign In'}
          </Button>
        </form>
      {/if}
    </div>
  </div>