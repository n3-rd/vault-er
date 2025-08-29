import { writable } from 'svelte/store';

export interface User {
  id: string;
  email: string;
}

export const authStore = writable<{
  user: User | null;
  isAuthenticated: boolean;
}>({
  user: null,
  isAuthenticated: false
});

export async function loginUser(email: string, password: string): Promise<void> {
  // Placeholder for actual authentication logic
  if (!email || !password) {
    throw new Error('Email and password are required');
  }

  try {
    // Simulate API call
    const user = {
      id: 'user123',
      email: email
    };

    authStore.update(store => ({
      user,
      isAuthenticated: true
    }));
  } catch (error) {
    throw new Error('Login failed');
  }
}

export function logoutUser() {
  authStore.update(store => ({
    user: null,
    isAuthenticated: false
  }));
} 