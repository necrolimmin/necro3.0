import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api-cinema.bekhruz21.uz'

export const api = axios.create({
  baseURL: `${API_URL}/api/v1`,
  headers: { 'Content-Type': 'application/json' },
})

// Attach token
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('nova_token')
    if (token) config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Auto-refresh on 401
api.interceptors.response.use(
  (r) => r,
  async (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      const refresh = localStorage.getItem('nova_refresh')
      if (refresh) {
        try {
          const { data } = await axios.post(`${API_URL}/api/v1/auth/refresh`, { refresh_token: refresh })
          localStorage.setItem('nova_token', data.access_token)
          localStorage.setItem('nova_refresh', data.refresh_token)
          error.config.headers.Authorization = `Bearer ${data.access_token}`
          return api.request(error.config)
        } catch {
          localStorage.clear()
          window.location.href = '/login'
        }
      } else {
        localStorage.clear()
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

// Auth
export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', new URLSearchParams({ username: email, password }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }),
  register: (email: string, username: string, password: string) =>
    api.post('/auth/register', { email, username, password }),
  refresh: (refresh_token: string) => api.post('/auth/refresh', { refresh_token }),
}

// Media
export const mediaApi = {
  list: (params?: Record<string, any>) => api.get('/media/', { params }),
  get: (id: string) => api.get(`/media/${id}`),
  featured: () => api.get('/media/featured'),
  continueWatching: () => api.get('/media/continue-watching'),
  stream: (id: string, episode_id?: string) => api.get(`/media/${id}/stream`, { params: { episode_id } }),
  updateProgress: (id: string, position: number, duration?: number, episode_id?: string) =>
    api.put(`/media/${id}/progress`, null, { params: { position, duration, episode_id } }),
  upload: (formData: FormData, params?: Record<string, any>, onProgress?: (p: number) => void) =>
    api.post('/media/upload', formData, {
      params,
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (e) => onProgress && onProgress(Math.round((e.loaded * 100) / (e.total || 1))),
    }),
}

// Search
export const searchApi = {
  search: (q: string) => api.get('/search/', { params: { q } }),
  searchTmdb: (q: string) => api.get('/search/tmdb', { params: { q } }),
}

// Profiles
export const profilesApi = {
  list: () => api.get('/profiles/'),
  create: (name: string, avatar_color?: string) => api.post('/profiles/', { name, avatar_color }),
  delete: (id: string) => api.delete(`/profiles/${id}`),
}

// Admin
export const adminApi = {
  stats: () => api.get('/admin/stats'),
  users: () => api.get('/admin/users'),
  media: () => api.get('/admin/media'),
  toggleUser: (id: string) => api.put(`/admin/users/${id}/toggle`),
  updateMedia: (id: string, formData: FormData) =>
    api.post(`/admin/media/${id}/update`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  deleteMedia: (id: string) => api.delete(`/admin/media/${id}`),
}
