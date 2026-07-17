import axios from 'axios'

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'https://drogueriaback.onrender.com/api',
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
