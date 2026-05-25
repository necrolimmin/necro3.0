'use client'
import { useRef } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { MediaCard } from './MediaCard'

interface MediaRowProps {
  title: string
  items: any[]
  loading?: boolean
}

export function MediaRow({ title, items, loading }: MediaRowProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  const scroll = (dir: 'left' | 'right') => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: dir === 'right' ? 600 : -600, behavior: 'smooth' })
    }
  }

  return (
    <div className="relative group/row">
      <div className="flex items-center justify-between mb-4 px-6 md:px-12">
        <div>
          <div className="section-kicker mb-1">Nova Library</div>
          <h2 className="text-lg md:text-xl font-bold text-white/90">{title}</h2>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover/row:opacity-100 transition-opacity">
          <button onClick={() => scroll('left')}
            className="w-8 h-8 glass rounded-full flex items-center justify-center hover:bg-white/15 transition-all">
            <ChevronLeft size={16} />
          </button>
          <button onClick={() => scroll('right')}
            className="w-8 h-8 glass rounded-full flex items-center justify-center hover:bg-white/15 transition-all">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div ref={scrollRef} className="flex gap-3 overflow-x-auto scrollbar-none px-6 md:px-12 pb-2"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        {loading
          ? Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="shrink-0 w-36 md:w-44 aspect-[2/3] skeleton rounded-xl" />
            ))
          : items.map((item, i) => (
              <div key={item.id} className="shrink-0 w-36 md:w-44">
                <MediaCard {...item} index={i} />
              </div>
            ))
        }
      </div>
    </div>
  )
}
