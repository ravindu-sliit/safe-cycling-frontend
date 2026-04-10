import axios from 'axios'

const normalizeApiBaseUrl = (value) => {
  const trimmedValue = String(value || '').trim().replace(/\/+$/, '')

  if (!trimmedValue) {
    return 'http://localhost:5000/api'
  }

  return trimmedValue.endsWith('/api') ? trimmedValue : `${trimmedValue}/api`
}

const apiBaseUrlFromEnv = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL

const api = axios.create({
  baseURL: normalizeApiBaseUrl(apiBaseUrlFromEnv),
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')

      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        window.location.assign('/login')
      }
    }

    return Promise.reject(error)
  },
)

export default api
