import { create } from 'zustand'

type ThemeMode = 'light' | 'dark'

type AuthUser = {
  id: string
  email: string
  username: string
  fullName: string
  role: string
  storeId?: string | null
  storeName?: string | null
  storeType?: 'PHARMACY' | 'STORE' | null
  permissions?: string[] | null
}

type UiState = {
  theme: ThemeMode
  sidebarOpen: boolean
  sidebarCollapsed: boolean
  isAuthenticated: boolean
  user: AuthUser | null
  setTheme: (theme: ThemeMode) => void
  toggleTheme: () => void
  setSidebarOpen: (open: boolean) => void
  toggleSidebar: () => void
  setSidebarCollapsed: (collapsed: boolean) => void
  toggleSidebarCollapsed: () => void
  login: (user: AuthUser, accessToken: string, refreshToken: string) => void
  logout: () => void
}

const THEME_STORAGE_KEY = 'drogueria-theme'
const SIDEBAR_COLLAPSED_KEY = 'drogueria-sidebar-collapsed'
const ACCESS_TOKEN_KEY = 'access_token'
const REFRESH_TOKEN_KEY = 'refresh_token'
const USER_STORAGE_KEY = 'drogueria-user'

function applyTheme(theme: ThemeMode) {
  if (typeof document === 'undefined') {
    return
  }

  document.documentElement.classList.toggle('dark', theme === 'dark')
  document.documentElement.dataset.theme = theme
}

function getInitialTheme(): ThemeMode {
  if (typeof window === 'undefined') {
    return 'light'
  }

  const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY)

  if (storedTheme === 'light' || storedTheme === 'dark') {
    return storedTheme
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function getInitialUser(): AuthUser | null {
  if (typeof window === 'undefined') return null
  const raw = window.localStorage.getItem(USER_STORAGE_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as AuthUser
  } catch {
    return null
  }
}

function hasStoredSession(): boolean {
  if (typeof window === 'undefined') return false
  return Boolean(window.localStorage.getItem(ACCESS_TOKEN_KEY))
}

function getInitialSidebarCollapsed(): boolean {
  if (typeof window === 'undefined') return false
  return window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true'
}

const initialTheme = getInitialTheme()
applyTheme(initialTheme)

export const useUiStore = create<UiState>((set, get) => ({
  theme: initialTheme,
  sidebarOpen: false,
  sidebarCollapsed: getInitialSidebarCollapsed(),
  isAuthenticated: hasStoredSession(),
  user: getInitialUser(),
  setTheme: (theme) => {
    applyTheme(theme)
    window.localStorage.setItem(THEME_STORAGE_KEY, theme)
    set({ theme })
  },
  toggleTheme: () => {
    const nextTheme = get().theme === 'dark' ? 'light' : 'dark'
    applyTheme(nextTheme)
    window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme)
    set({ theme: nextTheme })
  },
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarCollapsed: (collapsed) => {
    window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(collapsed))
    set({ sidebarCollapsed: collapsed })
  },
  toggleSidebarCollapsed: () => {
    const next = !get().sidebarCollapsed
    window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next))
    set({ sidebarCollapsed: next })
  },
  login: (user, accessToken, refreshToken) => {
    window.localStorage.setItem(ACCESS_TOKEN_KEY, accessToken)
    window.localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
    window.localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user))
    set({ isAuthenticated: true, user })
  },
  logout: () => {
    window.localStorage.removeItem(ACCESS_TOKEN_KEY)
    window.localStorage.removeItem(REFRESH_TOKEN_KEY)
    window.localStorage.removeItem(USER_STORAGE_KEY)
    set({ isAuthenticated: false, user: null, sidebarOpen: false })
  },
}))
