import { create } from "@storacha/client"
import { authStore } from "./auth-store"
import { load } from "@tauri-apps/plugin-store"

export const login = async (email: string) => {
  console.log('Login function called with email:', email)
  try {
    const c = await create()
    console.log('Storacha client created')
    
    authStore.update(state => ({ 
      ...state, 
      emailSent: true, 
      emailSentTo: email 
    }))
    
    console.log('About to call c.login()')
    const account = await c.login(email as `${string}@${string}`)
    console.log('Login initiated, account:', account)
    
    account.plan.wait().then(async () => {
      console.log('Plan selection completed')
      const store = await load('auth.json')
      await store.set('email', email)
      await store.save()
      
      authStore.update(state => ({
        ...state,
        client: c,
        emailSent: false,
        emailSentTo: null
      }))
    }).catch((error) => {
      console.error('Plan selection error:', error)
      authStore.update(state => ({
        ...state,
        emailSent: false,
        emailSentTo: null
      }))
    })
    
  } catch (error) {
    console.error('Login error:', error)
    if (error && typeof error === 'object' && 'toString' in error) {
      const errorStr = error.toString()
      if (errorStr.includes('network') || errorStr.includes('timeout')) {
        authStore.update(state => ({
          ...state,
          emailSent: false,
          emailSentTo: null
        }))
      }
    }
  }
}

export const resetEmailSent = () => {
  console.log('Resetting email sent state')
  authStore.update(state => ({
    ...state,
    emailSent: false,
    emailSentTo: null
  }))
}

export const logoutUser = async () => {
  try {
    // Clear the stored email
    const store = await load('auth.json')
    await store.delete('email')
    await store.save()
    
    // Reset the auth store state completely
    authStore.update(state => ({
      ...state,
      client: null,
      loading: false,
      emailSent: false,
      emailSentTo: null
    }))
    
    // Reload the page to ensure clean state
    window.location.reload();
  } catch (error) {
    console.error('Logout error:', error)
    // Even if there's an error, try to reset the state
    authStore.update(state => ({
      ...state,
      client: null,
      loading: false,
      emailSent: false,
      emailSentTo: null
    }))
    window.location.reload();
  }
}