'use client'
import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminApi, mediaApi } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import { motion } from 'framer-motion'
import {
  Users, Film, Activity, TrendingUp, Upload, Trash2, ToggleLeft,
  ToggleRight, Search, Plus, ArrowLeft, Loader2, CheckCircle, Clock, XCircle,
  BarChart2, Eye, Pencil, X, Save
} from 'lucide-react'
import Link from 'next/link'
import { useDropzone } from 'react-dropzone'
import toast from 'react-hot-toast'

const GENRE_OPTIONS = [
  'Action', 'Comedy', 'Drama', 'Horror', 'Sci-Fi', 'Thriller',
  'Romance', 'Documentary', 'Animation', 'Fantasy', 'Crime', 'Adventure', 'Anime'
]

type UploadForm = {
  title: string
  type: string
  tmdb_id: string
  genres: string[]
  description: string
  release_date: string
  runtime: string
  rating: string
}

function toggleGenre(list: string[], genre: string) {
  return list.includes(genre) ? list.filter(item => item !== genre) : [...list, genre]
}
function StatCard({ icon: Icon, label, value, color, delay = 0 }: any) {
  return (
    <motion.div className="glass-card p-6"
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5 }}>
      <div className="flex items-center justify-between mb-4">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${color}`}>
          <Icon size={20} className="text-white" />
        </div>
      </div>
      <p className="text-3xl font-bold mb-1">{value ?? '-'}</p>
      <p className="text-sm text-white/50">{label}</p>
    </motion.div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { icon: any, color: string }> = {
    ready: { icon: CheckCircle, color: 'text-emerald-400' },
    processing: { icon: Loader2, color: 'text-yellow-400' },
    pending: { icon: Clock, color: 'text-blue-400' },
    error: { icon: XCircle, color: 'text-red-400' },
  }
  const { icon: Icon, color } = map[status] || map.pending
  return (
    <span className={`flex items-center gap-1.5 text-xs font-medium ${color}`}>
      <Icon size={12} className={status === 'processing' ? 'animate-spin' : ''} />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  )
}

export default function AdminPage() {
  const router = useRouter()
  const pathname = usePathname()
  const { user, isAdmin } = useAuthStore()
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<'overview' | 'media' | 'users' | 'upload'>('overview')
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploading, setUploading] = useState(false)
  const emptyUploadForm: UploadForm = { title: '', type: 'movie', tmdb_id: '', genres: [], description: '', release_date: '', runtime: '', rating: '' }
  const [uploadForm, setUploadForm] = useState(emptyUploadForm)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [selectedPoster, setSelectedPoster] = useState<File | null>(null)
  const [selectedBackdrop, setSelectedBackdrop] = useState<File | null>(null)
  const [editingMedia, setEditingMedia] = useState<any | null>(null)
  const [editForm, setEditForm] = useState({
    title: '',
    type: 'movie',
    description: '',
    is_featured: false,
    poster_position_x: 50,
    poster_position_y: 50,
    genres: [] as string[],
  })
  const [editPoster, setEditPoster] = useState<File | null>(null)
  const [editBackdrop, setEditBackdrop] = useState<File | null>(null)
  const [editSaving, setEditSaving] = useState(false)
  const [episodeForm, setEpisodeForm] = useState({ season_number: '1', episode_number: '1', title: '', runtime: '', air_date: '', description: '' })
  const [episodeFile, setEpisodeFile] = useState<File | null>(null)
  const [episodeSaving, setEpisodeSaving] = useState(false)
  const [episodeProgress, setEpisodeProgress] = useState(0)
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (!user || !isAdmin()) router.push('/')
  }, [user])

  useEffect(() => {
    if (pathname.endsWith('/upload')) setTab('upload')
  }, [pathname])

  const { data: stats } = useQuery({ queryKey: ['admin-stats'], queryFn: () => adminApi.stats().then(r => r.data) })
  const { data: users = [] } = useQuery({ queryKey: ['admin-users'], queryFn: () => adminApi.users().then(r => r.data), enabled: tab === 'users' })
  const { data: adminMedia = [] } = useQuery({
    queryKey: ['admin-media'],
    queryFn: () => adminApi.media().then(r => r.data),
    enabled: tab === 'media',
    refetchInterval: tab === 'media' ? 5000 : false,
  })

  const toggleUser = useMutation({
    mutationFn: (id: string) => adminApi.toggleUser(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-users'] }),
  })
  const deleteMedia = useMutation({
    mutationFn: (id: string) => adminApi.deleteMedia(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-media'] }); toast.success('Media deleted') },
  })

  const openEditMedia = (media: any) => {
    setEditingMedia(media)
    setEditForm({
      title: media.title || '',
      type: media.type || 'movie',
      description: media.description || '',
      is_featured: !!media.is_featured,
      poster_position_x: media.poster_position_x ?? 50,
      poster_position_y: media.poster_position_y ?? 50,
      genres: media.genres || [],
    })
    setEditPoster(null)
    setEditBackdrop(null)
    setEpisodeFile(null)
    setEpisodeProgress(0)
    setEpisodeForm({ season_number: '1', episode_number: '1', title: '', runtime: '', air_date: '', description: '' })
  }

  const handleEditSave = async () => {
    if (!editingMedia || !editForm.title.trim()) return toast.error('Title is required')
    setEditSaving(true)
    try {
      const fd = new FormData()
      fd.append('title', editForm.title)
      fd.append('type', editForm.type)
      fd.append('description', editForm.description)
      fd.append('is_featured', editForm.is_featured ? 'true' : 'false')
      fd.append('poster_position_x', String(editForm.poster_position_x))
      fd.append('poster_position_y', String(editForm.poster_position_y))
      fd.append('genres', editForm.genres.join(','))
      if (editPoster) fd.append('poster', editPoster)
      if (editBackdrop) fd.append('backdrop', editBackdrop)
      await adminApi.updateMedia(editingMedia.id, fd)
      toast.success('Media updated')
      setEditingMedia(null)
      setEditPoster(null)
      setEditBackdrop(null)
      queryClient.invalidateQueries({ queryKey: ['admin-media'] })
      queryClient.invalidateQueries({ queryKey: ['featured'] })
      queryClient.invalidateQueries({ queryKey: ['movies'] })
      queryClient.invalidateQueries({ queryKey: ['series'] })
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Update failed')
    } finally {
      setEditSaving(false)
    }
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { 'video/*': ['.mp4', '.mkv', '.avi', '.mov', '.webm'] },
    maxFiles: 1,
    onDrop: ([file]) => setSelectedFile(file),
  })

  const posterDropzone = useDropzone({
    accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.webp'] },
    maxFiles: 1,
    onDrop: ([file]) => setSelectedPoster(file),
  })

  const backdropDropzone = useDropzone({
    accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.webp'] },
    maxFiles: 1,
    onDrop: ([file]) => setSelectedBackdrop(file),
  })
  const handleUpload = async () => {
    if (!selectedFile || !uploadForm.title) return toast.error('Fill in all fields')
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', selectedFile)
      if (selectedPoster) fd.append('poster', selectedPoster)
      if (selectedBackdrop) fd.append('backdrop', selectedBackdrop)
      await mediaApi.upload(fd, {
        title: uploadForm.title,
        type: uploadForm.type,
        tmdb_id: uploadForm.tmdb_id || undefined,
        genres: uploadForm.genres.join(',') || undefined,
        description: uploadForm.description || undefined,
        release_date: uploadForm.release_date || undefined,
        runtime: uploadForm.runtime || undefined,
        rating: uploadForm.rating || undefined,
      }, setUploadProgress)
      toast.success('Upload complete!')
      setSelectedFile(null)
      setSelectedPoster(null)
      setSelectedBackdrop(null)
      setUploadForm(emptyUploadForm)
      setUploadProgress(0)
      queryClient.invalidateQueries({ queryKey: ['admin-media'] })
    } catch {
      toast.error('Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const handleAddEpisode = async () => {
    if (!editingMedia || !episodeFile || !episodeForm.title.trim()) {
      return toast.error('Episode title and video file are required')
    }
    setEpisodeSaving(true)
    try {
      const fd = new FormData()
      fd.append('file', episodeFile)
      fd.append('season_number', episodeForm.season_number || '1')
      fd.append('episode_number', episodeForm.episode_number || '1')
      fd.append('title', episodeForm.title)
      fd.append('runtime', episodeForm.runtime)
      fd.append('air_date', episodeForm.air_date)
      fd.append('description', episodeForm.description)
      const { data } = await adminApi.addEpisode(editingMedia.id, fd, setEpisodeProgress)
      const episode = data.episode
      setEditingMedia((current: any) => {
        if (!current) return current
        const seasons = [...(current.seasons || [])]
        const idx = seasons.findIndex((season: any) => season.season_number === episode.season_number)
        if (idx >= 0) {
          seasons[idx] = {
            ...seasons[idx],
            episodes: [...(seasons[idx].episodes || []), episode].sort((a: any, b: any) => a.episode_number - b.episode_number),
          }
        } else {
          seasons.push({ id: episode.season_id, season_number: episode.season_number, name: `Season ${episode.season_number}`, episodes: [episode] })
          seasons.sort((a: any, b: any) => a.season_number - b.season_number)
        }
        return { ...current, seasons }
      })
      setEpisodeFile(null)
      setEpisodeProgress(0)
      setEpisodeForm({ season_number: episodeForm.season_number, episode_number: String(Number(episodeForm.episode_number || 1) + 1), title: '', runtime: '', air_date: '', description: '' })
      queryClient.invalidateQueries({ queryKey: ['admin-media'] })
      toast.success('Episode added')
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Episode upload failed')
    } finally {
      setEpisodeSaving(false)
    }
  }

  const handleDeleteEpisode = async (episodeId: string) => {
    try {
      await adminApi.deleteEpisode(episodeId)
      setEditingMedia((current: any) => current ? {
        ...current,
        seasons: (current.seasons || []).map((season: any) => ({
          ...season,
          episodes: (season.episodes || []).filter((episode: any) => episode.id !== episodeId),
        })),
      } : current)
      queryClient.invalidateQueries({ queryKey: ['admin-media'] })
      toast.success('Episode deleted')
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Could not delete episode')
    }
  }
  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart2 },
    { id: 'media', label: 'Media Library', icon: Film },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'upload', label: 'Upload', icon: Upload },
  ]

  const filteredMedia = adminMedia.filter((m: any) =>
    m.title.toLowerCase().includes(search.toLowerCase())
  )
  const filteredUsers = users.filter((u: any) =>
    u.username.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="page-canvas">
      {/* Ambient */}
      <div className="fixed top-0 left-0 w-[600px] h-[600px] bg-violet-900/8 rounded-full blur-[150px] pointer-events-none" />

      {/* Header */}
      <div className="sticky top-0 z-40 glass-strong border-b border-white/[0.08]">
        <div className="max-w-[1400px] mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="w-9 h-9 glass rounded-xl flex items-center justify-center hover:bg-white/[0.12] transition-all">
              <ArrowLeft size={16} />
            </Link>
            <div>
              <h1 className="font-bold text-lg leading-none">Admin Dashboard</h1>
              <p className="text-xs text-white/40">NovaStream Control Panel</p>
            </div>
          </div>
          <Link href="/admin/upload" className="btn-nova flex items-center gap-2 text-sm px-4 py-2">
            <Plus size={15} /> Add Media
          </Link>
        </div>

        {/* Tabs */}
        <div className="max-w-[1400px] mx-auto px-6 flex gap-1 pb-3">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setTab(id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                tab === id ? 'bg-violet-600/20 text-violet-300 border border-violet-500/20' : 'text-white/50 hover:text-white hover:bg-white/[0.06]'
              }`}>
              <Icon size={15} /> {label}
            </button>
          ))}
        </div>
      </div>

      <div className="relative z-10 max-w-[1400px] mx-auto px-6 py-8">
        <div className="admin-hero rounded-2xl p-6 md:p-8 mb-8 overflow-hidden relative">
          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
              <div className="section-kicker mb-3">NovaStream Studio</div>
              <h2 className="text-2xl md:text-4xl font-bold tracking-tight">Content command center</h2>
              <p className="text-white/50 mt-2 max-w-2xl">
                Upload films, polish posters, feature titles on the home screen, and keep your private library tidy.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-3 min-w-[280px]">
              <button onClick={() => setTab('upload')} className="nova-surface rounded-2xl p-4 text-left hover:border-violet-500/30 transition-all">
                <Upload size={18} className="text-violet-300 mb-3" />
                <p className="text-sm font-semibold">Upload</p>
                <p className="text-xs text-white/38 mt-1">New title</p>
              </button>
              <button onClick={() => setTab('media')} className="nova-surface rounded-2xl p-4 text-left hover:border-violet-500/30 transition-all">
                <Film size={18} className="text-cyan-300 mb-3" />
                <p className="text-sm font-semibold">Library</p>
                <p className="text-xs text-white/38 mt-1">Edit media</p>
              </button>
              <button onClick={() => setTab('users')} className="nova-surface rounded-2xl p-4 text-left hover:border-violet-500/30 transition-all">
                <Users size={18} className="text-emerald-300 mb-3" />
                <p className="text-sm font-semibold">Users</p>
                <p className="text-xs text-white/38 mt-1">Access</p>
              </button>
            </div>
          </div>
        </div>

        {/* Overview */}
        {tab === 'overview' && (
          <div className="space-y-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard icon={Users} label="Total Users" value={stats?.users?.total} color="bg-violet-600/20" delay={0} />
              <StatCard icon={Film} label="Total Media" value={stats?.media?.total} color="bg-cyan-600/20" delay={0.1} />
              <StatCard icon={CheckCircle} label="Ready to Stream" value={stats?.media?.ready} color="bg-emerald-600/20" delay={0.2} />
              <StatCard icon={Eye} label="Views This Week" value={stats?.activity?.watches_this_week} color="bg-amber-600/20" delay={0.3} />
            </div>

            {stats?.media?.processing > 0 && (
              <div className="glass-card p-5 flex items-center gap-4 border border-yellow-500/20">
                <Loader2 size={20} className="animate-spin text-yellow-400 shrink-0" />
                <div>
                  <p className="font-semibold text-sm">{stats.media.processing} file(s) processing</p>
                  <p className="text-xs text-white/50">FFmpeg transcoding in progress</p>
                </div>
              </div>
            )}

            {/* Quick stats graph placeholder */}
            <div className="glass-card p-6">
              <h3 className="font-bold mb-4 flex items-center gap-2"><TrendingUp size={18} className="text-violet-400" /> Platform Activity</h3>
              <div className="grid grid-cols-3 gap-6 text-center">
                <div>
                  <p className="text-3xl font-bold text-violet-400">{stats?.media?.ready || 0}</p>
                  <p className="text-xs text-white/50 mt-1">Streamable titles</p>
                </div>
                <div>
                  <p className="text-3xl font-bold text-blue-400">{stats?.users?.total || 0}</p>
                  <p className="text-xs text-white/50 mt-1">Registered users</p>
                </div>
                <div>
                  <p className="text-3xl font-bold text-emerald-400">{stats?.activity?.watches_this_week || 0}</p>
                  <p className="text-xs text-white/50 mt-1">Watches this week</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Media Library */}
        {tab === 'media' && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex-1 relative">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" />
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search media..."
                  className="w-full bg-white/[0.06] border border-white/10 rounded-xl pl-11 pr-4 py-2.5 text-sm text-white placeholder-white/30 outline-none focus:border-violet-500/50 transition-all" />
              </div>
            </div>

            <div className="glass-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/[0.08]">
                      <th className="text-left px-5 py-3.5 text-white/50 font-medium">Title</th>
                      <th className="text-left px-4 py-3.5 text-white/50 font-medium hidden md:table-cell">Type</th>
                      <th className="text-left px-4 py-3.5 text-white/50 font-medium">Status</th>
                      <th className="text-left px-4 py-3.5 text-white/50 font-medium hidden lg:table-cell">Added</th>
                      <th className="px-4 py-3.5 text-white/50 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMedia.map((m: any) => (
                      <tr key={m.id} className="table-row-soft">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            {m.poster_url && (
                              <img
                                src={m.poster_url}
                                alt=""
                                className="w-10 h-14 rounded-lg object-cover shrink-0 shadow-lg"
                                style={{ objectPosition: `${m.poster_position_x ?? 50}% ${m.poster_position_y ?? 50}%` }}
                              />
                            )}
                            <div>
                              <span className="font-medium truncate max-w-[240px] block">{m.title}</span>
                              {m.is_featured && <span className="text-[11px] text-violet-300">Featured on home</span>}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 hidden md:table-cell">
                          <span className="badge badge-nova capitalize">{m.type}</span>
                        </td>
                        <td className="px-4 py-3.5"><StatusBadge status={m.status} /></td>
                        <td className="px-4 py-3.5 text-white/40 hidden lg:table-cell text-xs">
                          {new Date(m.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => openEditMedia(m)}
                              className="w-8 h-8 rounded-lg hover:bg-violet-500/15 flex items-center justify-center text-white/40 hover:text-violet-300 transition-all">
                              <Pencil size={14} />
                            </button>
                            <button onClick={() => deleteMedia.mutate(m.id)}
                              className="w-8 h-8 rounded-lg hover:bg-red-500/15 flex items-center justify-center text-white/40 hover:text-red-400 transition-all">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredMedia.length === 0 && (
                      <tr><td colSpan={5} className="px-5 py-12 text-center text-white/30">No media found</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Users */}
        {tab === 'users' && (
          <div className="space-y-4">
            <div className="relative">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search users..."
                className="w-full bg-white/[0.06] border border-white/10 rounded-xl pl-11 pr-4 py-2.5 text-sm text-white placeholder-white/30 outline-none focus:border-violet-500/50 transition-all" />
            </div>

            <div className="glass-card overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.08]">
                    <th className="text-left px-5 py-3.5 text-white/50 font-medium">User</th>
                    <th className="text-left px-4 py-3.5 text-white/50 font-medium hidden md:table-cell">Role</th>
                    <th className="text-left px-4 py-3.5 text-white/50 font-medium">Status</th>
                    <th className="text-left px-4 py-3.5 text-white/50 font-medium hidden lg:table-cell">Joined</th>
                    <th className="px-4 py-3.5 text-right text-white/50 font-medium">Toggle</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((u: any) => (
                    <tr key={u.id} className="border-b border-white/[0.04] hover:bg-white/[0.03] transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center text-xs font-bold shrink-0">
                            {u.username.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium">{u.username}</p>
                            <p className="text-xs text-white/40">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 hidden md:table-cell">
                        <span className={`badge ${u.role === 'admin' ? 'badge-nova' : 'badge-hd'}`}>{u.role}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`text-xs font-medium ${u.is_active ? 'text-emerald-400' : 'text-red-400'}`}>
                          {u.is_active ? 'Active' : 'Disabled'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-white/40 hidden lg:table-cell text-xs">
                        {new Date(u.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <button onClick={() => toggleUser.mutate(u.id)}
                          className={`transition-colors ${u.is_active ? 'text-emerald-400 hover:text-emerald-300' : 'text-white/30 hover:text-white/60'}`}>
                          {u.is_active ? <ToggleRight size={22} /> : <ToggleLeft size={22} />}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Upload */}
        {tab === 'upload' && (
          <div className="max-w-2xl mx-auto space-y-6">
            <div>
              <h2 className="text-xl font-bold mb-1">Upload Media</h2>
              <p className="text-sm text-white/50">Add movies or series to your library</p>
            </div>

            <div className="glass-card p-6 space-y-5">
              <div>
                <label className="block text-xs font-medium text-white/60 mb-1.5 uppercase tracking-wide">Title</label>
                <input value={uploadForm.title} onChange={e => setUploadForm({...uploadForm, title: e.target.value})}
                  placeholder="e.g. Inception"
                  className="w-full bg-white/[0.06] border border-white/10 rounded-xl px-4 py-3 text-sm text-white caret-violet-200 placeholder-white/30 outline-none focus:border-violet-500/60 transition-all" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-white/60 mb-1.5 uppercase tracking-wide">Type</label>
                  <select value={uploadForm.type} onChange={e => setUploadForm({...uploadForm, type: e.target.value})}
                    className="w-full bg-[#11162a] border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-violet-500/60 transition-all">
                    <option className="bg-[#11162a] text-white" value="movie">Movie</option>
                    <option className="bg-[#11162a] text-white" value="series">Series</option>
                    <option className="bg-[#11162a] text-white" value="documentary">Documentary</option>
                    <option className="bg-[#11162a] text-white" value="anime">Anime</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-white/60 mb-1.5 uppercase tracking-wide">TMDB ID (optional)</label>
                  <input value={uploadForm.tmdb_id} onChange={e => setUploadForm({...uploadForm, tmdb_id: e.target.value})}
                    placeholder="e.g. 27205"
                    className="w-full bg-white/[0.06] border border-white/10 rounded-xl px-4 py-3 text-sm text-white caret-violet-200 placeholder-white/30 outline-none focus:border-violet-500/60 transition-all" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-white/60 mb-2 uppercase tracking-wide">Genres</label>
                <div className="flex flex-wrap gap-2">
                  {GENRE_OPTIONS.map((genre) => {
                    const active = uploadForm.genres.includes(genre)
                    return (
                      <button
                        key={genre}
                        type="button"
                        onClick={() => setUploadForm({...uploadForm, genres: toggleGenre(uploadForm.genres, genre)})}
                        className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-all ${active ? 'border-violet-400 bg-violet-500/25 text-white' : 'border-white/10 bg-white/[0.04] text-white/55 hover:text-white hover:border-white/25'}`}
                      >
                        {genre}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="grid sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-white/60 mb-1.5 uppercase tracking-wide">Release date</label>
                  <input type="date" value={uploadForm.release_date} onChange={e => setUploadForm({...uploadForm, release_date: e.target.value})}
                    className="w-full bg-white/[0.06] border border-white/10 rounded-xl px-4 py-3 text-sm text-white caret-violet-200 outline-none focus:border-violet-500/60 transition-all [color-scheme:dark]" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-white/60 mb-1.5 uppercase tracking-wide">Runtime</label>
                  <input type="number" min="1" value={uploadForm.runtime} onChange={e => setUploadForm({...uploadForm, runtime: e.target.value})}
                    placeholder="148 min"
                    className="w-full bg-white/[0.06] border border-white/10 rounded-xl px-4 py-3 text-sm text-white caret-violet-200 placeholder-white/30 outline-none focus:border-violet-500/60 transition-all" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-white/60 mb-1.5 uppercase tracking-wide">Rating</label>
                  <input type="number" min="0" max="10" step="0.1" value={uploadForm.rating} onChange={e => setUploadForm({...uploadForm, rating: e.target.value})}
                    placeholder="8.4"
                    className="w-full bg-white/[0.06] border border-white/10 rounded-xl px-4 py-3 text-sm text-white caret-violet-200 placeholder-white/30 outline-none focus:border-violet-500/60 transition-all" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-white/60 mb-1.5 uppercase tracking-wide">Description</label>
                <textarea value={uploadForm.description} onChange={e => setUploadForm({...uploadForm, description: e.target.value})}
                  rows={4}
                  placeholder="Short description shown on the media page..."
                  className="w-full bg-white/[0.06] border border-white/10 rounded-xl px-4 py-3 text-sm text-white caret-violet-200 placeholder-white/30 outline-none focus:border-violet-500/60 transition-all resize-none" />
              </div>

              {/* Dropzone */}
              <div {...getRootProps()} className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${
                isDragActive ? 'border-violet-500 bg-violet-500/10' : 'border-white/15 hover:border-white/30 hover:bg-white/[0.03]'
              }`}>
                <input {...getInputProps()} />
                <Upload size={32} className="mx-auto mb-3 text-white/30" />
                {selectedFile ? (
                  <div>
                    <p className="font-semibold text-violet-300">{selectedFile.name}</p>
                    <p className="text-xs text-white/40 mt-1">{(selectedFile.size / 1e9).toFixed(2)} GB</p>
                  </div>
                ) : (
                  <div>
                    <p className="font-medium text-white/70">Drop video file here</p>
                    <p className="text-sm text-white/40 mt-1">MP4, MKV, AVI, MOV supported</p>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-white/60 mb-1.5 uppercase tracking-wide">Poster Image</label>
                <div
                  {...posterDropzone.getRootProps()}
                  className={`border border-dashed rounded-2xl p-4 cursor-pointer transition-all ${
                    posterDropzone.isDragActive ? 'border-violet-500 bg-violet-500/10' : 'border-white/15 hover:border-white/30 hover:bg-white/[0.03]'
                  }`}
                >
                  <input {...posterDropzone.getInputProps()} />
                  <div className="flex items-center gap-4">
                    <div className="w-20 aspect-[2/3] rounded-xl bg-white/[0.06] overflow-hidden border border-white/10 shrink-0">
                      {selectedPoster ? (
                        <img src={URL.createObjectURL(selectedPoster)} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white/30">
                          <Film size={22} />
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-white/75">
                        {selectedPoster ? selectedPoster.name : 'Add poster image'}
                      </p>
                      <p className="text-sm text-white/40 mt-1">JPG, PNG or WEBP. Vertical poster works best.</p>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-white/60 mb-1.5 uppercase tracking-wide">Backdrop Image</label>
                <div
                  {...backdropDropzone.getRootProps()}
                  className={`border border-dashed rounded-2xl p-4 cursor-pointer transition-all ${
                    backdropDropzone.isDragActive ? 'border-violet-500 bg-violet-500/10' : 'border-white/15 hover:border-white/30 hover:bg-white/[0.03]'
                  }`}
                >
                  <input {...backdropDropzone.getInputProps()} />
                  <div className="flex items-center gap-4">
                    <div className="w-28 aspect-video rounded-xl bg-white/[0.06] overflow-hidden border border-white/10 shrink-0">
                      {selectedBackdrop ? (
                        <img src={URL.createObjectURL(selectedBackdrop)} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white/30">
                          <Film size={22} />
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-white/75">
                        {selectedBackdrop ? selectedBackdrop.name : 'Add backdrop image'}
                      </p>
                      <p className="text-sm text-white/40 mt-1">Wide JPG, PNG or WEBP. This is the big background on the movie page.</p>
                    </div>
                  </div>
                </div>
              </div>
              {uploading && (
                <div>
                  <div className="flex justify-between text-xs text-white/50 mb-1.5">
                    <span>Uploading...</span><span>{uploadProgress}%</span>
                  </div>
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-violet-500 to-violet-400 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }} />
                  </div>
                </div>
              )}

              <motion.button onClick={handleUpload} disabled={!selectedFile || uploading || !uploadForm.title}
                className="btn-nova w-full flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
                {uploading ? <><Loader2 size={16} className="animate-spin" /> Uploading...</> : <><Upload size={16} /> Upload & Process</>}
              </motion.button>
            </div>
          </div>
        )}
      </div>

      {editingMedia && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setEditingMedia(null)} />
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="relative w-full max-w-5xl max-h-[90vh] glass-strong border border-white/10 rounded-2xl shadow-2xl overflow-y-auto"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08]">
              <div>
                <h2 className="font-bold text-lg">Edit Media</h2>
                <p className="text-xs text-white/40">Update metadata and replace poster</p>
              </div>
              <button onClick={() => setEditingMedia(null)}
                className="w-9 h-9 rounded-xl hover:bg-white/[0.08] flex items-center justify-center text-white/60 hover:text-white transition-all">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 grid md:grid-cols-[220px_1fr] gap-6">
              <div>
                <label className="block text-xs font-medium text-white/60 mb-2 uppercase tracking-wide">Poster</label>
                <label className="block cursor-pointer group">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(e) => setEditPoster(e.target.files?.[0] || null)}
                  />
                  <div className="aspect-[2/3] rounded-2xl overflow-hidden bg-white/[0.06] border border-white/10 group-hover:border-violet-500/40 transition-all">
                    {editPoster ? (
                      <img
                        src={URL.createObjectURL(editPoster)}
                        alt=""
                        className="w-full h-full object-cover"
                        style={{ objectPosition: `${editForm.poster_position_x}% ${editForm.poster_position_y}%` }}
                      />
                    ) : editingMedia.poster_url ? (
                      <img
                        src={editingMedia.poster_url}
                        alt=""
                        className="w-full h-full object-cover"
                        style={{ objectPosition: `${editForm.poster_position_x}% ${editForm.poster_position_y}%` }}
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-white/35">
                        <Film size={32} />
                        <span className="text-xs">Choose poster</span>
                      </div>
                    )}
                  </div>
                </label>
                <p className="text-xs text-white/35 mt-2">Click poster to replace it. Use vertical JPG, PNG or WEBP.</p>
                <div className="mt-5">
                  <label className="block text-xs font-medium text-white/60 mb-2 uppercase tracking-wide">Backdrop</label>
                  <label className="block cursor-pointer group">
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={(e) => setEditBackdrop(e.target.files?.[0] || null)}
                    />
                    <div className="aspect-video rounded-2xl overflow-hidden bg-white/[0.06] border border-white/10 group-hover:border-violet-500/40 transition-all">
                      {editBackdrop ? (
                        <img src={URL.createObjectURL(editBackdrop)} alt="" className="w-full h-full object-cover" />
                      ) : editingMedia.backdrop_url ? (
                        <img src={editingMedia.backdrop_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-white/35">
                          <Film size={28} />
                          <span className="text-xs">Choose backdrop</span>
                        </div>
                      )}
                    </div>
                  </label>
                  <p className="text-xs text-white/35 mt-2">This image appears behind the title on the movie page.</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-white/60 mb-1.5 uppercase tracking-wide">Title</label>
                  <input value={editForm.title} onChange={e => setEditForm({...editForm, title: e.target.value})}
                    className="w-full bg-white/[0.06] border border-white/10 rounded-xl px-4 py-3 text-sm text-white caret-violet-200 outline-none focus:border-violet-500/60 transition-all" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-white/60 mb-1.5 uppercase tracking-wide">Type</label>
                    <select value={editForm.type} onChange={e => setEditForm({...editForm, type: e.target.value})}
                      className="w-full bg-[#11162a] border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-violet-500/60 transition-all">
                      <option className="bg-[#11162a] text-white" value="movie">Movie</option>
                      <option className="bg-[#11162a] text-white" value="series">Series</option>
                      <option className="bg-[#11162a] text-white" value="documentary">Documentary</option>
                      <option className="bg-[#11162a] text-white" value="anime">Anime</option>
                    </select>
                  </div>
                  <label className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.06] px-4 mt-6 cursor-pointer hover:bg-white/[0.08] transition-all">
                    <input
                      type="checkbox"
                      checked={editForm.is_featured}
                      onChange={e => setEditForm({...editForm, is_featured: e.target.checked})}
                      className="accent-violet-500"
                    />
                    <span className="text-sm font-medium text-white/80">Featured on home</span>
                  </label>
                </div>

                <div>
                  <label className="block text-xs font-medium text-white/60 mb-2 uppercase tracking-wide">Genres</label>
                  <div className="flex flex-wrap gap-2">
                    {GENRE_OPTIONS.map((genre) => {
                      const active = editForm.genres.includes(genre)
                      return (
                        <button
                          key={genre}
                          type="button"
                          onClick={() => setEditForm({...editForm, genres: toggleGenre(editForm.genres, genre)})}
                          className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-all ${active ? 'border-violet-400 bg-violet-500/25 text-white' : 'border-white/10 bg-white/[0.04] text-white/55 hover:text-white hover:border-white/25'}`}
                        >
                          {genre}
                        </button>
                      )
                    })}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-white/60 mb-1.5 uppercase tracking-wide">Description</label>
                  <textarea value={editForm.description} onChange={e => setEditForm({...editForm, description: e.target.value})}
                    rows={5}
                    placeholder="Short movie description..."
                    className="w-full bg-white/[0.06] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 outline-none focus:border-violet-500/60 transition-all resize-none" />
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-4 space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-medium text-white/60 uppercase tracking-wide">Poster horizontal position</label>
                      <span className="text-xs text-white/40">{editForm.poster_position_x}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={editForm.poster_position_x}
                      onChange={e => setEditForm({...editForm, poster_position_x: Number(e.target.value)})}
                      className="w-full accent-violet-500"
                    />
                    <div className="flex justify-between text-[11px] text-white/30 mt-1">
                      <span>Left</span><span>Center</span><span>Right</span>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-medium text-white/60 uppercase tracking-wide">Poster vertical position</label>
                      <span className="text-xs text-white/40">{editForm.poster_position_y}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={editForm.poster_position_y}
                      onChange={e => setEditForm({...editForm, poster_position_y: Number(e.target.value)})}
                      className="w-full accent-violet-500"
                    />
                    <div className="flex justify-between text-[11px] text-white/30 mt-1">
                      <span>Top</span><span>Center</span><span>Bottom</span>
                    </div>
                  </div>
                </div>

                {(editingMedia.type === 'series' || editingMedia.type === 'anime') && (
                  <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-4 space-y-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-semibold text-white">Episodes</h3>
                        <p className="text-xs text-white/40">Add new episodes to this {editingMedia.type === 'anime' ? 'anime' : 'series'} without creating a new media item.</p>
                      </div>
                      <span className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-xs text-white/55">
                        {(editingMedia.seasons || []).reduce((sum: number, season: any) => sum + (season.episodes?.length || 0), 0)} total
                      </span>
                    </div>

                    <div className="space-y-3">
                      {(editingMedia.seasons || []).length === 0 ? (
                        <div className="rounded-xl border border-dashed border-white/10 bg-black/15 px-4 py-5 text-sm text-white/40">
                          No episodes yet.
                        </div>
                      ) : (
                        [...(editingMedia.seasons || [])]
                          .sort((a: any, b: any) => a.season_number - b.season_number)
                          .map((season: any) => (
                            <div key={season.id || season.season_number} className="rounded-xl border border-white/10 bg-black/15 p-3">
                              <div className="flex items-center justify-between mb-2">
                                <p className="text-xs font-semibold uppercase tracking-wide text-white/60">
                                  Season {season.season_number}
                                </p>
                                <span className="text-[11px] text-white/35">{season.episodes?.length || 0} episodes</span>
                              </div>
                              <div className="space-y-2">
                                {[...(season.episodes || [])]
                                  .sort((a: any, b: any) => a.episode_number - b.episode_number)
                                  .map((episode: any) => (
                                    <div key={episode.id} className="flex items-center justify-between gap-3 rounded-lg bg-white/[0.04] px-3 py-2">
                                      <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                          <span className="shrink-0 rounded-md bg-violet-500/20 px-2 py-0.5 text-[11px] font-bold text-violet-200">
                                            S{season.season_number} E{episode.episode_number}
                                          </span>
                                          <p className="truncate text-sm font-medium text-white/85">{episode.title}</p>
                                        </div>
                                        <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-white/35">
                                          {episode.runtime ? <span>{episode.runtime} min</span> : null}
                                          {episode.air_date ? <span>{episode.air_date}</span> : null}
                                          <StatusBadge status={episode.status || 'pending'} />
                                        </div>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteEpisode(episode.id)}
                                        className="shrink-0 w-8 h-8 rounded-lg text-white/45 hover:text-red-300 hover:bg-red-500/10 transition-all flex items-center justify-center"
                                        title="Delete episode"
                                      >
                                        <Trash2 size={15} />
                                      </button>
                                    </div>
                                  ))}
                              </div>
                            </div>
                          ))
                      )}
                    </div>

                    <div className="border-t border-white/10 pt-4 space-y-3">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-white/60 mb-1.5 uppercase tracking-wide">Season</label>
                          <input
                            type="number"
                            min="1"
                            value={episodeForm.season_number}
                            onChange={e => setEpisodeForm({...episodeForm, season_number: e.target.value})}
                            className="w-full bg-[#11162a] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-violet-500/60 transition-all"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-white/60 mb-1.5 uppercase tracking-wide">Episode</label>
                          <input
                            type="number"
                            min="1"
                            value={episodeForm.episode_number}
                            onChange={e => setEpisodeForm({...episodeForm, episode_number: e.target.value})}
                            className="w-full bg-[#11162a] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-violet-500/60 transition-all"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-white/60 mb-1.5 uppercase tracking-wide">Runtime</label>
                          <input
                            type="number"
                            min="1"
                            placeholder="45"
                            value={episodeForm.runtime}
                            onChange={e => setEpisodeForm({...episodeForm, runtime: e.target.value})}
                            className="w-full bg-[#11162a] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/30 outline-none focus:border-violet-500/60 transition-all"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-white/60 mb-1.5 uppercase tracking-wide">Air date</label>
                          <input
                            type="date"
                            value={episodeForm.air_date}
                            onChange={e => setEpisodeForm({...episodeForm, air_date: e.target.value})}
                            className="w-full bg-[#11162a] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-violet-500/60 transition-all"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-white/60 mb-1.5 uppercase tracking-wide">Episode title</label>
                        <input
                          value={episodeForm.title}
                          onChange={e => setEpisodeForm({...episodeForm, title: e.target.value})}
                          placeholder="Pilot"
                          className="w-full bg-[#11162a] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 outline-none focus:border-violet-500/60 transition-all"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-white/60 mb-1.5 uppercase tracking-wide">Episode description</label>
                        <textarea
                          rows={3}
                          value={episodeForm.description}
                          onChange={e => setEpisodeForm({...episodeForm, description: e.target.value})}
                          placeholder="Short episode description..."
                          className="w-full bg-[#11162a] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 outline-none focus:border-violet-500/60 transition-all resize-none"
                        />
                      </div>

                      <div className="flex flex-col md:flex-row gap-3 md:items-end">
                        <div className="flex-1">
                          <label className="block text-xs font-medium text-white/60 mb-1.5 uppercase tracking-wide">Video file</label>
                          <label className="flex min-h-[46px] cursor-pointer items-center justify-between gap-3 rounded-xl border border-dashed border-white/15 bg-[#11162a] px-4 py-3 hover:border-violet-500/50 transition-all">
                            <input
                              type="file"
                              accept="video/mp4,video/webm,video/x-matroska,video/*"
                              className="hidden"
                              onChange={(e) => setEpisodeFile(e.target.files?.[0] || null)}
                            />
                            <span className="truncate text-sm text-white/60">{episodeFile ? episodeFile.name : 'Choose episode video'}</span>
                            <Upload size={15} className="shrink-0 text-white/35" />
                          </label>
                        </div>
                        <button
                          type="button"
                          onClick={handleAddEpisode}
                          disabled={episodeSaving}
                          className="btn-nova flex min-h-[46px] items-center justify-center gap-2 px-5 py-2 disabled:opacity-50"
                        >
                          {episodeSaving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                          Add Episode
                        </button>
                      </div>

                      {episodeSaving && episodeProgress > 0 && (
                        <div>
                          <div className="flex justify-between text-xs text-white/50 mb-1.5">
                            <span>Uploading episode...</span><span>{episodeProgress}%</span>
                          </div>
                          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-violet-500 to-violet-400 rounded-full transition-all duration-300"
                              style={{ width: `${episodeProgress}%` }} />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-2">
                  <button onClick={() => setEditingMedia(null)}
                    className="px-4 py-2 rounded-xl text-sm font-semibold text-white/60 hover:text-white hover:bg-white/[0.08] transition-all">
                    Cancel
                  </button>
                  <button onClick={handleEditSave} disabled={editSaving}
                    className="btn-nova flex items-center gap-2 px-5 py-2 disabled:opacity-50">
                    {editSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}





