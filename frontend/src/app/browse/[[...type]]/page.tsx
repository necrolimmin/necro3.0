'use client'
import { useState } from 'react'
import { useParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { mediaApi } from '@/lib/api'
import { Navbar } from '@/components/layout/Navbar'
import { MediaCard } from '@/components/media/MediaCard'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, ChevronDown, SlidersHorizontal, X } from 'lucide-react'

const GENRES = ['Action', 'Comedy', 'Drama', 'Horror', 'Sci-Fi', 'Thriller', 'Romance', 'Documentary', 'Animation']
const SORTS = [
  { value: '-created_at', label: 'Newest' },
  { value: '-rating', label: 'Top Rated' },
  { value: 'title', label: 'A-Z' },
]

export default function BrowsePage() {
  const params = useParams()
  const typeParam = params?.type as string | undefined
  const [genre, setGenre] = useState<string>()
  const [sort, setSort] = useState('-created_at')
  const [page, setPage] = useState(1)
  const [filtersOpen, setFiltersOpen] = useState(false)

  const typeMap: Record<string, string> = { movies: 'movie', series: 'series', documentary: 'documentary', anime: 'anime' }
  const type = typeParam ? typeMap[typeParam] : undefined
  const selectedGenre = GENRES.find(g => g.toLowerCase() === genre)
  const selectedSort = SORTS.find(s => s.value === sort) || SORTS[0]

  const { data, isLoading } = useQuery({
    queryKey: ['browse', type, genre, sort, page],
    queryFn: () => mediaApi.list({ type, genre, sort, page, limit: 24 }).then(r => r.data),
  })

  const titles: Record<string, string> = { movie: 'Movies', series: 'TV Series', documentary: 'Documentaries', anime: 'Anime' }

  const chooseGenre = (next?: string) => {
    setGenre(next)
    setPage(1)
  }

  const chooseSort = (next: string) => {
    setSort(next)
    setPage(1)
  }

  return (
    <div className="min-h-screen bg-[#030712]">
      <Navbar />
      <div className="pt-24 pb-20 max-w-[1600px] mx-auto px-6 md:px-12">
        <motion.div className="mb-8" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl md:text-4xl font-bold mb-2">
            {type ? titles[type] : 'All Titles'}
          </h1>
          <p className="text-white/50">{data?.total || 0} titles available</p>
        </motion.div>

        <motion.div className="relative z-30 mb-8 flex flex-wrap items-center gap-3"
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <button
            onClick={() => setFiltersOpen(v => !v)}
            className={`flex h-10 items-center gap-2 rounded-xl border px-4 text-sm font-semibold transition-all ${
              filtersOpen ? 'border-violet-500/45 bg-violet-500/15 text-violet-100' : 'border-white/10 bg-white/[0.06] text-white/75 hover:border-white/20 hover:bg-white/[0.10]'
            }`}
          >
            <SlidersHorizontal size={16} />
            Filters
            <ChevronDown size={15} className={`transition-transform ${filtersOpen ? 'rotate-180' : ''}`} />
          </button>

          {selectedGenre && (
            <button onClick={() => chooseGenre(undefined)} className="flex h-9 items-center gap-2 rounded-xl border border-violet-500/25 bg-violet-500/15 px-3 text-xs font-semibold text-violet-100">
              {selectedGenre}
              <X size={13} />
            </button>
          )}

          <span className="flex h-9 items-center rounded-xl border border-white/10 bg-white/[0.04] px-3 text-xs font-medium text-white/55">
            Sort: <span className="ml-1 text-white/80">{selectedSort.label}</span>
          </span>

          <AnimatePresence>
            {filtersOpen && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.98 }}
                transition={{ duration: 0.18 }}
                className="absolute left-0 top-12 w-full max-w-2xl rounded-2xl border border-white/10 bg-[#090d1d]/95 p-4 shadow-2xl shadow-black/40 backdrop-blur-2xl"
              >
                <div className="flex items-center justify-between gap-4 border-b border-white/8 pb-3">
                  <div>
                    <p className="text-sm font-bold text-white/90">Filters</p>
                    <p className="text-xs text-white/40">Narrow the library without stretching the toolbar.</p>
                  </div>
                  {(genre || sort !== '-created_at') && (
                    <button onClick={() => { chooseGenre(undefined); chooseSort('-created_at') }} className="text-xs font-semibold text-violet-300 hover:text-violet-200">
                      Reset
                    </button>
                  )}
                </div>

                <div className="grid gap-5 pt-4 md:grid-cols-[1fr_180px]">
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-white/45">Genre</p>
                    <div className="flex flex-wrap gap-2">
                      <button onClick={() => chooseGenre(undefined)}
                        className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-all ${!genre ? 'bg-violet-500/25 text-violet-100' : 'bg-white/[0.06] text-white/65 hover:bg-white/[0.10] hover:text-white'}`}>
                        {!genre && <Check size={13} />} All
                      </button>
                      {GENRES.map(g => {
                        const value = g.toLowerCase()
                        const active = genre === value
                        return (
                          <button key={g} onClick={() => chooseGenre(active ? undefined : value)}
                            className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-all ${active ? 'bg-violet-500/25 text-violet-100' : 'bg-white/[0.06] text-white/65 hover:bg-white/[0.10] hover:text-white'}`}>
                            {active && <Check size={13} />} {g}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-white/45">Sort</p>
                    <div className="flex flex-col gap-2">
                      {SORTS.map(s => {
                        const active = sort === s.value
                        return (
                          <button key={s.value} onClick={() => chooseSort(s.value)}
                            className={`flex items-center justify-between rounded-xl px-3 py-2 text-left text-xs font-semibold transition-all ${active ? 'bg-violet-500/25 text-violet-100' : 'bg-white/[0.06] text-white/65 hover:bg-white/[0.10] hover:text-white'}`}>
                            {s.label}
                            {active && <Check size={13} />}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {isLoading ? (
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7">
            {Array.from({ length: 24 }).map((_, i) => (
              <div key={i} className="aspect-[2/3] skeleton rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7">
            {data?.items?.map((item: any, i: number) => (
              <MediaCard key={item.id} {...item} index={i} />
            ))}
          </div>
        )}

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