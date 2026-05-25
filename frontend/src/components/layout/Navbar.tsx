'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { Search, Bell, User, ChevronDown, Tv2, Film, Compass, Star, LayoutDashboard, LogOut, Menu, X } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { motion, AnimatePresence } from 'framer-motion'
import { LanguageToggle } from '@/components/ui/LanguageToggle'
import { useLanguage } from '@/lib/i18n'

export function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [userMenu, setUserMenu] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const router = useRouter()
  const pathname = usePathname()
  const { user, logout, isAdmin } = useAuthStore()
  const { t } = useLanguage()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery)}`)
      setSearchOpen(false)
    }
  }

  const handleLogout = () => {
    logout()
    router.push('/login')
  }

  const navLinks = [
    { href: '/', label: t.home, icon: Compass },
    { href: '/browse/movies', label: t.movies, icon: Film },
    { href: '/browse/series', label: t.series, icon: Tv2 },
    { href: '/browse/new', label: t.new, icon: Star },
  ]

  return (
    <>
      <motion.nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          scrolled ? 'glass-strong border-b border-white/8' : 'bg-transparent'
        }`}
        initial={{ y: -80 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="max-w-[1600px] mx-auto px-6 h-16 flex items-center justify-between gap-6">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center shadow-lg shadow-purple-900/50">
              <Tv2 size={16} className="text-white" />
            </div>
            <span className="text-[17px] font-bold tracking-tight bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent">
              Nova<span className="text-violet-400">Stream</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map(({ href, label }) => (
              <Link key={href} href={href}
                className={`nav-item ${pathname === href ? 'active' : ''}`}>
                {label}
              </Link>
            ))}
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-3">
            {/* Search */}
            <AnimatePresence>
              {searchOpen ? (
                <motion.form onSubmit={handleSearch}
                  initial={{ width: 0, opacity: 0 }} animate={{ width: 260, opacity: 1 }} exit={{ width: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  className="overflow-hidden"
                >
                  <input
                    autoFocus
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder={t.searchPlaceholder}
                    className="w-full bg-white/8 border border-white/12 rounded-xl px-4 py-2 text-sm text-white placeholder-white/40 outline-none focus:border-violet-500/50 focus:bg-white/12 transition-all"
                    onBlur={() => !searchQuery && setSearchOpen(false)}
                  />
                </motion.form>
              ) : (
                <motion.button onClick={() => setSearchOpen(true)}
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-white/60 hover:text-white hover:bg-white/8 transition-all"
                  whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Search size={18} />
                </motion.button>
              )}
            </AnimatePresence>

            <LanguageToggle />

            <button className="w-9 h-9 rounded-xl flex items-center justify-center text-white/60 hover:text-white hover:bg-white/8 transition-all relative">
              <Bell size={18} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-violet-500 rounded-full"></span>
            </button>

            {/* User Menu */}
            <div className="relative">
              <button onClick={() => setUserMenu(!userMenu)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl hover:bg-white/8 transition-all">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center text-xs font-bold">
                  {user?.username?.charAt(0).toUpperCase() || 'U'}
                </div>
                <ChevronDown size={14} className={`text-white/60 transition-transform ${userMenu ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {userMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.96 }}
                    transition={{ duration: 0.2 }}
                    className="absolute right-0 top-full mt-2 w-52 glass-strong rounded-2xl overflow-hidden border border-white/10 shadow-2xl"
                  >
                    <div className="px-4 py-3 border-b border-white/8">
                      <p className="font-semibold text-sm">{user?.username}</p>
                      <p className="text-xs text-white/40">{user?.email}</p>
                    </div>
                    <div className="py-1">
                      <Link href="/profiles" onClick={() => setUserMenu(false)}
                        className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/8 text-sm text-white/80 hover:text-white transition-all">
                        <User size={15} /> {t.profiles}
                      </Link>
                      {isAdmin() && (
                        <Link href="/admin" onClick={() => setUserMenu(false)}
                          className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/8 text-sm text-white/80 hover:text-white transition-all">
                          <LayoutDashboard size={15} /> {t.adminDashboard}
                        </Link>
                      )}
                      <button onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-red-500/10 text-sm text-red-400 hover:text-red-300 transition-all">
                        <LogOut size={15} /> {t.signOut}
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Mobile menu toggle */}
            <button className="md:hidden w-9 h-9 rounded-xl flex items-center justify-center hover:bg-white/8 transition-all"
              onClick={() => setMenuOpen(!menuOpen)}>
              {menuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
              className="md:hidden glass-strong border-t border-white/8 overflow-hidden"
            >
              <div className="px-6 py-4 flex flex-col gap-1">
                {navLinks.map(({ href, label, icon: Icon }) => (
                  <Link key={href} href={href} onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-white/8 text-white/80 hover:text-white transition-all">
                    <Icon size={18} /> {label}
                  </Link>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.nav>
    </>
  )
}
