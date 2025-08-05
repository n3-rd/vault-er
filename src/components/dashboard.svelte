<script lang="ts">
    import { authStore, resetEmailSent } from '$lib/auth-store'
    import { Button } from "$lib/components/ui/button/index";
    import { load } from '@tauri-apps/plugin-store'
  
    const handleLogout = async () => {
      const store = await load('auth.json')
      await store.delete('email')
      await store.save()
      
      resetEmailSent()
      window.location.reload()
    }
  </script>
  
  <div class="min-h-screen">
    <div class="container mx-auto px-4 py-8">
      <!-- Header -->
      <div class="flex justify-between items-center mb-8">
        <div>
          <h1 class="text-4xl font-bold">VaultLink Dashboard</h1>
          <p class="text-muted-foreground mt-2">Secure decentralized file sharing</p>
        </div>
        <Button 
          onclick={handleLogout}
          variant="outline" 
          class=""
        >
          Logout
        </Button>
      </div>
  
      <!-- Main Content -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      </div>
    </div>
  </div>