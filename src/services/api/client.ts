import axios from 'axios'

// Normaliza la URL base quitando slashes finales, para evitar dobles "//"
// cuando la variable de entorno VITE_API_URL viene con un "/" al final
// (ej. "https://api.com/" en vez de "https://api.com/api").
// El fallback apunta al backend en Render por si VITE_API_URL no llega a
// definirse en el entorno de build (ej. variable no configurada en el hosting).
const rawBaseUrl = import.meta.env.VITE_API_URL || 'https://drogueriaback.onrender.com/api'
const normalizedBaseUrl = rawBaseUrl.replace(/\/+$/, '')

export const apiClient = axios.create({
  baseURL: normalizedBaseUrl,
  timeout: 8000,
  headers: {
    'Content-Type': 'application/json',
    'X-App-Client': 'drogueria-web',
  },
})

apiClient.interceptors.request.use((config) => {
  config.headers['X-Requested-From'] = 'dashboard'
  
  // Agregar token JWT si existe
  const token = localStorage.getItem('access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  
  return config
})

// ===== Renovación automática de sesión =====
// El access token dura poco (15 min por defecto en el backend). Sin este
// interceptor, cuando expira, TODAS las peticiones empiezan a fallar con 401
// de forma silenciosa: la app "se congela" (nada carga, ningún botón responde)
// y el único remedio era cerrar sesión y volver a entrar. Ahora, al recibir un
// 401, se intenta renovar el token con /auth/refresh y se reintenta la
// petición original una sola vez. Si el refresh también falla (refresh token
// vencido o inválido), se cierra la sesión y se redirige al login.
let refreshPromise: Promise<string | null> | null = null

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = localStorage.getItem('refresh_token')
  if (!refreshToken) return null

  try {
    const { data } = await axios.post<{ success: boolean; data: { accessToken: string; refreshToken: string } }>(
      `${normalizedBaseUrl}/auth/refresh`,
      { refreshToken },
    )
    localStorage.setItem('access_token', data.data.accessToken)
    localStorage.setItem('refresh_token', data.data.refreshToken)
    return data.data.accessToken
  } catch {
    return null
  }
}

function clearSessionAndRedirect() {
  localStorage.removeItem('access_token')
  localStorage.removeItem('refresh_token')
  localStorage.removeItem('drogueria-user')
  if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
    window.location.href = '/login'
  }
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    const isAuthEndpoint = originalRequest?.url?.includes('/auth/login') || originalRequest?.url?.includes('/auth/refresh')

    if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      originalRequest._retry = true

      // Si ya hay un refresh en curso (varias peticiones fallaron a la vez),
      // todas esperan el MISMO refresh en vez de disparar uno cada una.
      if (!refreshPromise) {
        refreshPromise = refreshAccessToken().finally(() => {
          refreshPromise = null
        })
      }

      const newToken = await refreshPromise
      if (newToken) {
        originalRequest.headers.Authorization = `Bearer ${newToken}`
        return apiClient(originalRequest)
      }

      clearSessionAndRedirect()
    }

    return Promise.reject(error)
  },
)

export async function simulateRequest<T>(data: T, delay = 250): Promise<T> {
  await new Promise((resolve) => window.setTimeout(resolve, delay))
  return structuredClone(data)
}
