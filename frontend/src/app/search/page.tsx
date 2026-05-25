'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { searchApi } from '@/lib/api'
import { Navbar } from '@/components/layout/Navbar'
import { MediaCard } from '@/components/media/MediaCard'
import { Search, Loader2 } from 'lucide-react'
import { motion } from 'framer-motion'

function SearchContent() {
  const params = useSearchParams()
  const q = params.get('q') || ''

  const { data, isLoading } = useQuery({
    queryKey: ['search', q],
    queryFn: () => searchApi.search(q).then(r => r.data),
    enabled: q.length > 0,
  })

  return (
    <div className="pt-24 pb-20 max-w-[1400px] mx-auto px-6 md:px-12">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-2">
          <Search size={20} className="text-violet-400" />
          <h1 className="text-2xl font-bold">Search Results</h1>
        </div>

        <p className="text-white/50 mb-10">
          {q ? <>Showing results for "<span className="text-white">{q}</span>"</> : 'Enter a search term'}
        </p>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 size={40} className="animate-spin text-violet-400" />
          </div>
        ) : data?.results?.length > 0 ? (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
            {data.results.map((item: any, i: number) => (
              <MediaCard key={item.id} {...item} index={i} />
            ))}
          </div>
        ) : q ? (
          <div className="text-center py-20">
            <Search size={48} className="mx-auto mb-4 text-white/20" />
            <p className="text-white/50 text-lg">No results found for "{q}"</p>
            <p className="text-white/30 text-sm mt-2">Try a different search term</p>
          </div>
        ) : null}
      </motion.div>
    </div>
  )
}

export default function SearchPage() {
  return (
    <div className="min-h-screen bg-[#030712]">
      <Navbar />
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 size={40} className="animate-spin text-violet-400" />
        </div>
      }>
        <SearchContent />
      </Suspense>
    </div>
  )
}
