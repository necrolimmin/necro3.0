'use client'
import { useState } from 'react'
import { useParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { mediaApi } from '@/lib/api'
import { Navbar } from '@/components/layout/Navbar'
import { MediaCard } from '@/components/media/MediaCard'
import { motion } from 'framer-motion'
import { Filter, SlidersHorizontal } from 'lucide-react'

const GENRES = ['Action', 'Comedy', 'Drama', 'Horror', 'Sci-Fi', 'Thriller', 'Romance', 'Documentary', 'Animation']
const SORTS = [
  { value: 'created_at', label: 'Newest' },
  { value: '-rating', label: 'Top Rated' },
  { value: 'title', label: 'A–Z' },
]

export default function BrowsePage() {
  const params = useParams()
  const typeParam = params?.type as string | undefined
  const [genre, setGenre] = useState<string>()
  const [sort, setSort] = useState('created_at')
  const [page, setPage] = useState(1)

  const typeMap: Record<string, string> = { movies: 'movie', series: 'series', documentary: 'documentary', anime: 'anime' }
  const type = typeParam ? typeMap[typeParam] : undefined

  const { data, isLoading } = useQuery({
    queryKey: ['browse', type, genre, sort, page],
    queryFn: () => mediaApi.list({ type, genre, sort, page, limit: 24 }).then(r => r.data),
  })

  const titles: Record<string, string> = { movie: 'Movies', series: 'TV Series', documentary: 'Documentaries', anime: 'Anime' }

  return (
    <div className="min-h-screen bg-[#030712]">
      <Navbar />
      <div className="pt-24 pb-20 max-w-[1600px] mx-auto px-6 md:px-12">
        {/* Header */}
        <motion.div className="mb-10" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl md:text-4xl font-bold mb-2">
            {type ? titles[type] : 'All Titles'}
          </h1>
          <p className="text-white/50">{data?.total || 0} titles available</p>
        </motion.div>

        {/* Filters */}
        <motion.div className="flex flex-wrap items-center gap-3 mb-8"
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <div className="flex items-center gap-2 text-sm text-white/50">
            <SlidersHorizontal size={15} /> Filters:
          </div>

          {GENRES.map(g => (
            <button key={g} onClick={() => setGenre(genre === g.toLowerCase() ? undefined : g.toLowerCase())}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                genre === g.toLowerCase()
                  ? 'bg-violet-600/30 border border-violet-500/40 text-violet-300'
                  : 'glass text-white/60 hover:text-white'
              }`}>
              {g}
            </button>
          ))}

          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-white/40">Sort:</span>
            <select value={sort} onChange={e => setSort(e.target.value)}
              className="bg-white/6 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-violet-500/50 transition-all">
              {SORTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
        </motion.div>

        {/* Grid */}
        {isLoading ? (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-3">
            {Array.from({ length: 24 }).map((_, i) => (
              <div key={i} className="aspect-[2/3] skeleton rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-3">
            {data?.items?.map((item: any, i: number) => (
              <MediaCard key={item.id} {...item} index={i} />
            ))}
          </div>
        )}

        {/* Pagination */}
        {data && data.total > 24 && (
          <div className="flex items-center justify-center gap-3 mt-12">
            <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1}
              className="px-5 py-2.5 glass rounded-xl text-sm font-medium disabled:opacity-40 hover:bg-white/10 transition-all">
              Previous
            </button>
            <span className="text-sm text-white/50">Page {page} of {Math.ceil(data.total / 24)}</span>
            <button onClick={() => setPage(p => p+1)} disabled={page >= Math.ceil(data.total / 24)}
              className="px-5 py-2.5 glass rounded-xl text-sm font-medium disabled:opacity-40 hover:bg-white/10 transition-all">
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
