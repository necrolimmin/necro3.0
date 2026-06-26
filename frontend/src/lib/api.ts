import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api-cinema.bekhruz21.uz'

export const api = axios.create({
  baseURL: `${API_URL}/api/v1`,
  headers: { 'Content-Type': 'application/json' },
})

let refreshPromise: Promise<string> | null = null

function expireSession() {
  localStorage.removeItem('nova_token')
  localStorage.removeItem('nova_refresh')
  localStorage.removeItem('nova-auth')

  if (window.location.pathname !== '/login') {
    window.location.replace('/login')
  }
}

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
    const config = error.config as (typeof error.config & { _retry?: boolean }) | undefined

    if (error.response?.status === 401 && typeof window !== 'undefined' && config && !config._retry) {
      config._retry = true
      const refresh = localStorage.getItem('nova_refresh')

      if (refresh) {
        try {
          refreshPromise ||= axios
            .post(`${API_URL}/api/v1/auth/refresh`, { refresh_token: refresh })
            .then(({ data }) => {
              localStorage.setItem('nova_token', data.access_token)
              localStorage.setItem('nova_refresh', data.refresh_token)
              return data.access_token as string
            })
            .finally(() => {
              refreshPromise = null
            })

          const accessToken = await refreshPromise
          config.headers.Authorization = `Bearer ${accessToken}`
          return api.request(config)
        } catch {
          expireSession()
        }
      } else {
        expireSession()
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

// Favorites
export const favoritesApi = {
  list: () => api.get('/favorites/'),
  status: (id: string) => api.get(`/favorites/${id}`),
  add: (id: string) => api.post(`/favorites/${id}`),
  remove: (id: string) => api.delete(`/favorites/${id}`),
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
  addEpisode: (mediaId: string, formData: FormData, onProgress?: (p: number) => void) =>
    api.post(`/admin/media/${mediaId}/episodes`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (e) => onProgress && onProgress(Math.round((e.loaded * 100) / (e.total || 1))),
    }),
  deleteEpisode: (episodeId: string) => api.delete(`/admin/episodes/${episodeId}`),
  deleteMedia: (id: string) => api.delete(`/admin/media/${id}`),
}

