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

export async function simulateRequest<T>(data: T, delay = 250): Promise<T> {
  await new Promise((resolve) => window.setTimeout(resolve, delay))
  return structuredClone(data)
}
