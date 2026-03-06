import axios from 'axios'
import { useAuthStore } from '../stores/auth'

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '',
  headers: {
    'Content-Type': 'application/json'
  }
})

// Request interceptor to add the auth token to every request
apiClient.interceptors.request.use((config) => {
  const authStore = useAuthStore()
  if (authStore.token) {
    config.headers.Authorization = `Bearer ${authStore.token}`
  }
  return config
})

export async function apiFetch(endpoint, options = {}) {
  try {
    const { method = 'GET', body, headers } = options

    // Axios uses 'data' property, fetch uses 'body'.
    // If body is a JSON string (common in fetch), parse it back to an object for Axios.
    let data = body
    if (typeof body === 'string') {
      try {
        data = JSON.parse(body)
      } catch {
        // leave as is if not JSON
      }
    }

    const response = await apiClient({
      url: endpoint,
      method,
      data,
      headers
    })

    return { ok: true, status: response.status, data: response.data }
  } catch (error) {
    const response = error.response
    return {
      ok: false,
      status: response ? response.status : 500,
      data: response ? response.data : { message: error.message || 'Network Error' }
    }
  }
}
