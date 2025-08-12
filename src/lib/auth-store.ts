import { writable, get } from 'svelte/store'
import { create } from '@storacha/client'
import { load } from '@tauri-apps/plugin-store'

export type AuthState = {
  client: any | null
  loading: boolean
  emailSent: boolean
  emailSentTo: string | null
}

export const authStore = writable<AuthState>({
  client: null,
  loading: true,
  emailSent: false,
  emailSentTo: null
})

// Initialize auth
;(async () => {
  try {
    const c = await create()
    const store = await load('auth.json')
    const email = await store.get('email')
    if (email) {
      try {
        await c.login(email as `${string}@${string}`)
        authStore.update(state => ({ ...state, client: c, loading: false }))
      } catch (e) {
        console.error('Login failed or timed out:', e)
        await store.delete('email')
        await store.save()
        authStore.update(state => ({ ...state, loading: false }))
      }
    } else {
      authStore.update(state => ({ ...state, loading: false }))
    }
  } catch (error) {
    console.error('Auth initialization error:', error)
    authStore.update(state => ({ ...state, loading: false }))
  }
})()

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

// File operations using the authenticated client
export const uploadFile = async (file: File) => {
  const state = get(authStore)
  const { client } = state
  if (!client) {
    throw new Error('Not authenticated')
  }
  
  try {
    const result = await client.upload(file)
    return result
  } catch (error) {
    console.error('Upload error:', error)
    throw error
  }
}

export const downloadFile = async (fileId: string) => {
  const state = get(authStore)
  const { client } = state
  if (!client) {
    throw new Error('Not authenticated')
  }
  
  try {
    const result = await client.download(fileId)
    return result
  } catch (error) {
    console.error('Download error:', error)
    throw error
  }
}

export const listFiles = async () => {
  const state = get(authStore)
  const { client } = state
  if (!client) {
    throw new Error('Not authenticated')
  }
  
  try {
    const files = await client.list()
    return files
  } catch (error) {
    console.error('List files error:', error)
    throw error
  }
}

export const shareFile = async (fileId: string, email: string, permissions: string[] = ['read']) => {
  const state = get(authStore)
  const { client } = state
  if (!client) {
    throw new Error('Not authenticated')
  }
  
  try {
    const result = await client.share(fileId, {
      email,
      permissions
    })
    return result
  } catch (error) {
    console.error('Share file error:', error)
    throw error
  }
} 

export const getSpaces = async () => {
  const state = get(authStore)
  const { client } = state
  if (!client) {
    throw new Error('Not authenticated')
  }
  return client.spaces()
}

export const setSpace = async (spaceId: string) => {
  const state = get(authStore)
  const { client } = state
  if (!client) {
    throw new Error('Not authenticated')
  }
  return client.setCurrentSpace(spaceId)
}

export const getCurrentSpace = async () => {
  const state = get(authStore)
  const { client } = state
  if (!client) {
    throw new Error('Not authenticated')
  }
  return client.currentSpace()
}

export const listContents = async () => {
  const state = get(authStore)
  const { client } = state
  if (!client) {
    throw new Error('Not authenticated')
  }

  let files = await client.capability.blob.list()
  return files
}

export const createSpace = async (name?: string) => {
  const state = get(authStore)
  const { client } = state
  if (!client) {
    throw new Error('Not authenticated')
  }
  return client.createSpace(name || '')
}