'use client'
import { useState } from 'react'
import { Languages } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { Language, useLanguage } from '@/lib/i18n'

const languages: { code: Language; label: string }[] = [
  { code: 'ru', label: 'RU' },
  { code: 'uz', label: 'UZ' },
  { code: 'en', label: 'EN' },
]

export function LanguageToggle() {
  const { language, setLanguage, t } = useLanguage()
  const [open, setOpen] = useState(false)

  const choose = (next: Language) => {
    setLanguage(next)
    setOpen(false)
  }

  return (
    <div className="relative">
      <button
        type="button"
        title={t.language}
        aria-label={t.language}
        onClick={() => setOpen(!open)}
        className={`h-9 px-3 rounded-xl flex items-center gap-2 text-xs font-semibold border transition-all ${
          open
            ? 'bg-violet-600/20 border-violet-500/30 text-white shadow-lg shadow-violet-950/20'
            : 'border-white/0 text-white/70 hover:text-white hover:bg-white/8'
        }`}
      >
        <Languages size={16} />
        <span>{language.toUpperCase()}</span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.18 }}
            className="absolute right-0 top-full mt-2 w-28 glass-strong rounded-2xl overflow-hidden border border-white/10 shadow-2xl z-50 p-1"
          >
            {languages.map((item) => (
              <button
                key={item.code}
                type="button"
                onClick={() => choose(item.code)}
                className={`w-full px-3 py-2 rounded-xl text-left text-xs font-semibold transition-all ${
                  language === item.code
                    ? 'bg-violet-600/30 text-violet-100'
                    : 'text-white/70 hover:text-white hover:bg-white/8'
                }`}
              >
                {item.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
