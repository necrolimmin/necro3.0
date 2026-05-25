import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface User {
  id: string
  email: string
  username: string
  role: 'admin' | 'user'
}

interface Profile {
  id: string
  name: string
  avatar_color: string
  avatar_url?: string
  is_kids: boolean
}

interface AuthState {
  user: User | null
  token: string | null
  refreshToken: string | null
  activeProfile: Profile | null
  setAuth: (user: User, token: string, refreshToken: string) => void
  setProfile: (profile: Profile) => void
  logout: () => void
  isAdmin: () => boolean
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      refreshToken: null,
      activeProfile: null,
      setAuth: (user, token, refreshToken) => {
        localStorage.setItem('nova_token', token)
        localStorage.setItem('nova_refresh', refreshToken)
        set({ user, token, refreshToken })
      },
      setProfile: (profile) => set({ activeProfile: profile }),
      logout: () => {
        localStorage.removeItem('nova_token')
        localStorage.removeItem('nova_refresh')
        set({ user: null, token: null, refreshToken: null, activeProfile: null })
      },
      isAdmin: () => get().user?.role === 'admin',
    }),
    { name: 'nova-auth', partialize: (s) => ({ user: s.user, activeProfile: s.activeProfile }) }
  )
)
